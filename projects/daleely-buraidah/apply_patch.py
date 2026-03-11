import argparse
import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
MASTER_JSON = DATA_DIR / 'master.json'
MASTER_CSV = DATA_DIR / 'master.csv'


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def save_json(path: Path, data):
    path.write_text('\ufeff' + json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def write_master_csv(records):
    fieldnames = []
    seen = set()
    for record in records:
        for key in record.keys():
            if key not in seen:
                seen.add(key)
                fieldnames.append(key)

    with MASTER_CSV.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def find_record(records, patch_doc):
    slug = patch_doc.get('slug')
    if slug:
        for record in records:
            if record.get('slug') == slug:
                return record

    match = patch_doc.get('match') or {}
    if match:
        candidates = []
        for record in records:
            if all(record.get(k) == v for k, v in match.items()):
                candidates.append(record)
        if len(candidates) == 1:
            return candidates[0]
        if len(candidates) > 1:
            raise SystemExit(f'Match is ambiguous: {match}')

    raise SystemExit('Could not match target record. Provide slug or an exact match object.')


def apply_patch(record, patch_doc):
    patch = patch_doc.get('patch')
    if not isinstance(patch, dict) or not patch:
        raise SystemExit('Patch file must contain a non-empty "patch" object.')

    changes = {}
    for key, new_value in patch.items():
        old_value = record.get(key)
        if old_value != new_value:
            record[key] = new_value
            changes[key] = {'old': old_value, 'new': new_value}
    return changes


def main():
    parser = argparse.ArgumentParser(description='Apply a patch.json file to daleely-buraidah master.json')
    parser.add_argument('patch_file', help='Path to patch.json file')
    parser.add_argument('--dry-run', action='store_true', help='Show changes without writing files')
    args = parser.parse_args()

    patch_path = Path(args.patch_file).resolve()
    if not patch_path.exists():
        raise SystemExit(f'Patch file not found: {patch_path}')

    master = load_json(MASTER_JSON)
    records = master.get('records', [])
    if not isinstance(records, list):
        raise SystemExit('master.json has no records array.')

    patch_doc = load_json(patch_path)
    record = find_record(records, patch_doc)
    changes = apply_patch(record, patch_doc)

    if not changes:
        print('No effective changes.')
        return

    print(f"Matched slug: {record.get('slug')}")
    for key, diff in changes.items():
        print(f"- {key}: {diff['old']} -> {diff['new']}")

    if args.dry_run:
        print('Dry run only. No files written.')
        return

    save_json(MASTER_JSON, master)
    write_master_csv(records)
    print('Updated data/master.json and data/master.csv')


if __name__ == '__main__':
    main()
