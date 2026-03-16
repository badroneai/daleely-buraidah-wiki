#!/usr/bin/env python3
"""
Professional Google Maps scraper runner for Daleely.

Built for long-running, resumable, operator-friendly scraping with optional
deterministic sharding across multiple machines.

Key features:
  - Reuses the existing extraction logic from scripts/scrape-gmaps.py
  - Deterministic sharding: split work across N devices safely
  - Worker-specific checkpoints and outputs
  - JSONL results for incremental durability
  - Validation warnings and quality score per record
  - Retry queue for failures and not-found records
  - Headless by default for stable long runs

Examples:
  python3 scripts/scrape-gmaps-pro.py --limit 20
  python3 scripts/scrape-gmaps-pro.py --missing phone --resume
  python3 scripts/scrape-gmaps-pro.py --shard-count 2 --shard-index 0 --worker-id pc-a --resume
  python3 scripts/scrape-gmaps-pro.py --shard-count 2 --shard-index 1 --worker-id pc-b --resume
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import platform
import random
import sys
import time
import traceback
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT = SCRIPT_DIR.parent
MASTER = ROOT / "master.json"
OUTPUT_ROOT = ROOT / "outputs" / "gmaps-pro"
BASE_SCRIPT = SCRIPT_DIR / "scrape-gmaps.py"


def load_base_script():
    spec = importlib.util.spec_from_file_location("scrape_gmaps_base", BASE_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load base scraper from {BASE_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BASE = load_base_script()


@dataclass
class WorkerPaths:
    root: Path
    checkpoint: Path
    results_jsonl: Path
    merge_ready_json: Path
    not_found_json: Path
    failures_json: Path
    summary_json: Path
    log_txt: Path


def utc_now() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def normalize_worker_id(value: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in value.strip())
    return safe or "worker"


def shard_for_slug(slug: str, shard_count: int) -> int:
    digest = hashlib.sha1(slug.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % shard_count


def count_non_empty_fields(result: dict[str, Any]) -> int:
    ignored = {"slug", "scraped_name", "_found", "_scraped_at", "website", "_meta"}
    return sum(
        1
        for key, value in result.items()
        if key not in ignored and value not in ("", "unknown", 0, None)
    )


def validate_result(result: dict[str, Any]) -> tuple[list[str], int]:
    warnings: list[str] = []
    score = 0

    if not result.get("_found"):
        warnings.append("not_found")
        return warnings, score

    if result.get("reference_url"):
        score += 2
    else:
        warnings.append("missing_reference_url")

    if result.get("phone"):
        score += 2
    if result.get("hours_summary"):
        score += 1

    rating = result.get("google_rating", 0) or 0
    reviews = result.get("google_reviews_count", 0) or 0
    if rating:
        try:
            rating_value = float(rating)
            if 1 <= rating_value <= 5:
                score += 2
            else:
                warnings.append("rating_out_of_range")
        except Exception:
            warnings.append("rating_invalid")
    if reviews:
        try:
            int(reviews)
            score += 1
        except Exception:
            warnings.append("reviews_invalid")

    if result.get("short_address"):
        score += 1
    else:
        warnings.append("missing_address")

    if result.get("district"):
        score += 1

    feature_hits = sum(
        1
        for key in (
            "outdoor_seating",
            "indoor_seating",
            "wifi",
            "parking",
            "family_friendly",
            "desserts",
        )
        if result.get(key) == "yes"
    )
    if feature_hits:
        score += 1

    if count_non_empty_fields(result) < 3:
        warnings.append("low_field_coverage")

    return warnings, score


def build_paths(worker_id: str) -> WorkerPaths:
    root = OUTPUT_ROOT / worker_id
    root.mkdir(parents=True, exist_ok=True)
    return WorkerPaths(
        root=root,
        checkpoint=root / "checkpoint.json",
        results_jsonl=root / "results.jsonl",
        merge_ready_json=root / "merge-ready.json",
        not_found_json=root / "not-found.json",
        failures_json=root / "failures.json",
        summary_json=root / "summary.json",
        log_txt=root / "run.log",
    )


def load_master_records() -> list[dict[str, Any]]:
    with open(MASTER, "r", encoding="utf-8") as handle:
        master = json.load(handle)
    excluded = {"permanently_closed", "duplicate", "archived", "branch_conflict"}
    return [
        record
        for record in master["records"]
        if record.get("sector") == "cafes" and record.get("status", "") not in excluded
    ]


def record_missing(record: dict[str, Any], field: str) -> bool:
    value = record.get(field)
    return value in (None, "", "unknown", 0, "0")


def filter_records(records: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    filtered = records

    if args.slugs:
        wanted = {item.strip() for item in args.slugs.split(",") if item.strip()}
        filtered = [record for record in filtered if record["slug"] in wanted]

    if args.missing:
        fields = [item.strip() for item in args.missing.split(",") if item.strip()]
        filtered = [
            record
            for record in filtered
            if any(record_missing(record, field) for field in fields)
        ]

    if args.shard_count > 1:
        filtered = [
            record
            for record in filtered
            if shard_for_slug(record["slug"], args.shard_count) == args.shard_index
        ]

    filtered.sort(key=lambda record: record["slug"])

    if args.limit:
        filtered = filtered[: args.limit]

    return filtered


def load_checkpoint(path: Path) -> dict[str, Any]:
    if path.exists():
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    return {
        "done_slugs": [],
        "results": {},
        "not_found": [],
        "failures": [],
        "started_at": utc_now(),
    }


def save_checkpoint(path: Path, payload: dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def write_log(path: Path, line: str) -> None:
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(line.rstrip() + "\n")


def build_merge_ready(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fields = [
        "phone",
        "official_instagram",
        "hours_summary",
        "google_rating",
        "google_reviews_count",
        "price_level",
        "short_address",
        "district",
        "reference_url",
        "outdoor_seating",
        "indoor_seating",
        "wifi",
        "parking",
        "family_friendly",
        "desserts",
    ]
    merge_ready: list[dict[str, Any]] = []
    for result in results:
        if not result.get("_found"):
            continue
        row = {"slug": result["slug"]}
        for field in fields:
            value = result.get(field)
            if value not in ("", "unknown", 0, None):
                row[field] = value
        if len(row) > 1:
            merge_ready.append(row)
    return merge_ready


def write_outputs(paths: WorkerPaths, checkpoint: dict[str, Any], meta: dict[str, Any]) -> None:
    results = list(checkpoint["results"].values())
    merge_ready = build_merge_ready(results)
    not_found = checkpoint["not_found"]
    failures = checkpoint["failures"]

    with open(paths.merge_ready_json, "w", encoding="utf-8") as handle:
        json.dump(merge_ready, handle, ensure_ascii=False, indent=2)

    with open(paths.not_found_json, "w", encoding="utf-8") as handle:
        json.dump(not_found, handle, ensure_ascii=False, indent=2)

    with open(paths.failures_json, "w", encoding="utf-8") as handle:
        json.dump(failures, handle, ensure_ascii=False, indent=2)

    summary = {
        "worker": meta,
        "finished_at": utc_now(),
        "done_count": len(checkpoint["done_slugs"]),
        "results_count": len(results),
        "merge_ready_count": len(merge_ready),
        "not_found_count": len(not_found),
        "failures_count": len(failures),
        "field_coverage": {},
    }

    for result in results:
        for key, value in result.items():
            if key.startswith("_") or key in {"slug", "scraped_name", "website"}:
                continue
            if value not in ("", "unknown", 0, None):
                summary["field_coverage"][key] = summary["field_coverage"].get(key, 0) + 1

    with open(paths.summary_json, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2)


def create_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Professional Google Maps scraper with resume and multi-device sharding."
    )
    parser.add_argument("--slugs", default="", help="Process specific slugs: slug1,slug2")
    parser.add_argument("--missing", default="", help="Only records missing one or more fields: phone,hours_summary")
    parser.add_argument("--limit", type=int, default=0, help="Maximum records for this run")
    parser.add_argument("--resume", action="store_true", help="Resume from worker checkpoint")
    parser.add_argument("--headless", action="store_true", default=True, help="Run headless (default true)")
    parser.add_argument("--show-browser", action="store_true", help="Show Chromium window")
    parser.add_argument("--delay-min", type=float, default=4.0, help="Minimum sleep between records")
    parser.add_argument("--delay-max", type=float, default=8.0, help="Maximum sleep between records")
    parser.add_argument("--extra-delay", type=float, default=0.0, help="Extra fixed delay between records")
    parser.add_argument("--max-retries", type=int, default=2, help="Retries per record before failure")
    parser.add_argument("--worker-id", default=platform.node() or "worker", help="Unique worker id")
    parser.add_argument("--shard-count", type=int, default=1, help="Total number of workers")
    parser.add_argument("--shard-index", type=int, default=0, help="This worker shard index, zero-based")
    return parser


def main() -> int:
    parser = create_arg_parser()
    args = parser.parse_args()

    if args.show_browser:
        args.headless = False

    if args.shard_count < 1:
        parser.error("--shard-count must be >= 1")
    if args.shard_index < 0 or args.shard_index >= args.shard_count:
        parser.error("--shard-index must be between 0 and shard-count-1")
    if args.delay_min > args.delay_max:
        parser.error("--delay-min must be <= --delay-max")

    worker_id = normalize_worker_id(args.worker_id)
    paths = build_paths(worker_id)
    checkpoint = load_checkpoint(paths.checkpoint) if args.resume else load_checkpoint(Path("/dev/null"))

    if not args.resume:
        checkpoint = {
            "done_slugs": [],
            "results": {},
            "not_found": [],
            "failures": [],
            "started_at": utc_now(),
        }

    records = filter_records(load_master_records(), args)
    done = set(checkpoint["done_slugs"])
    if args.resume and done:
        records = [record for record in records if record["slug"] not in done]

    meta = {
        "worker_id": worker_id,
        "machine": platform.node(),
        "shard_index": args.shard_index,
        "shard_count": args.shard_count,
        "headless": args.headless,
        "started_at": checkpoint.get("started_at", utc_now()),
    }

    print(f"📂 تحميل السجلات: {len(records)} مهمة لهذا العامل")
    print(f"👷 العامل: {worker_id} | shard {args.shard_index + 1}/{args.shard_count}")
    print(f"📁 المخرجات: {paths.root}")
    write_log(paths.log_txt, f"{utc_now()} START {json.dumps(meta, ensure_ascii=False)}")

    if not records:
        print("✅ لا يوجد شيء للتنفيذ")
        write_outputs(paths, checkpoint, meta)
        return 0

    with BASE.sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=args.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--lang=ar-SA,ar",
            ],
        )
        context = browser.new_context(
            locale="ar-SA",
            timezone_id="Asia/Riyadh",
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = context.new_page()

        try:
            page.goto("https://www.google.com/maps", wait_until="networkidle", timeout=BASE.TIMEOUT * 2)
            time.sleep(2)
            accept_btn = page.query_selector(
                'button[aria-label*="Accept"], button[aria-label*="قبول"], button:has-text("Accept all")'
            )
            if accept_btn:
                accept_btn.click()
                time.sleep(1)
        except Exception:
            pass

        for index, record in enumerate(records, start=1):
            slug = record["slug"]
            name = record["name"]
            print(f"[{index}/{len(records)}] {slug} ... ", end="", flush=True)

            success = False
            for attempt in range(1, args.max_retries + 2):
                try:
                    result = BASE.scrape_single_cafe(page, record)
                    warnings, quality_score = validate_result(result)
                    result["_meta"] = {
                        "worker_id": worker_id,
                        "attempt": attempt,
                        "quality_score": quality_score,
                        "warnings": warnings,
                        "field_count": count_non_empty_fields(result),
                    }

                    if result.get("_found"):
                        checkpoint["results"][slug] = result
                        append_jsonl(paths.results_jsonl, result)
                        print(f"✅ {result['_meta']['field_count']} حقل | score={quality_score}")
                        write_log(paths.log_txt, f"{utc_now()} OK {slug} {json.dumps(result['_meta'], ensure_ascii=False)}")
                    else:
                        item = {
                            "slug": slug,
                            "name": name,
                            "attempt": attempt,
                            "reason": "not_found",
                            "at": utc_now(),
                        }
                        checkpoint["not_found"].append(item)
                        print("❌ غير موجود")
                        write_log(paths.log_txt, f"{utc_now()} NOT_FOUND {slug}")

                    checkpoint["done_slugs"].append(slug)
                    save_checkpoint(paths.checkpoint, checkpoint)
                    success = True
                    break
                except Exception as exc:
                    last_attempt = attempt >= args.max_retries + 1
                    if last_attempt:
                        failure = {
                            "slug": slug,
                            "name": name,
                            "attempt": attempt,
                            "error": str(exc)[:300],
                            "traceback": traceback.format_exc(limit=3),
                            "at": utc_now(),
                        }
                        checkpoint["failures"].append(failure)
                        checkpoint["done_slugs"].append(slug)
                        save_checkpoint(paths.checkpoint, checkpoint)
                        print(f"⚠️ فشل نهائي: {str(exc)[:80]}")
                        write_log(paths.log_txt, f"{utc_now()} FAIL {slug} {failure['error']}")
                    else:
                        print(f"↻ retry {attempt}/{args.max_retries + 1}", end=" ", flush=True)
                        time.sleep(2 + attempt)

            if success:
                delay = random.uniform(args.delay_min, args.delay_max) + args.extra_delay
                time.sleep(delay)

        browser.close()

    write_outputs(paths, checkpoint, meta)
    print("✅ انتهى التشغيل")
    print(f"📁 merge-ready: {paths.merge_ready_json}")
    print(f"📁 summary: {paths.summary_json}")
    print(f"📁 checkpoint: {paths.checkpoint}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
