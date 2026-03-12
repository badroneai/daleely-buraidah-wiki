import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

BASE_DIR = Path(__file__).resolve().parent
QUEUE_DIR = BASE_DIR / 'agent_queue'
QUEUE_FILE = QUEUE_DIR / 'import_queue.json'
RESULTS_DIR = QUEUE_DIR / 'import_results'
PATCHES_DIR = RESULTS_DIR / 'patches'


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\ufeff' + json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def slugify(value: str):
    text = re.sub(r'https?://\S+', '', str(value or '').strip().lower())
    text = re.sub(r'[^a-z0-9\u0600-\u06FF]+', '-', text)
    text = re.sub(r'-+', '-', text).strip('-')
    return text or 'new-cafe'


def clean_google_maps_name(text=''):
    text = unquote(str(text or '').strip())
    text = re.sub(r'^.*?/place/', '', text)
    text = re.sub(r'/.*$', '', text)
    text = text.replace('+', ' ')
    text = text.replace('&amp;', '&')
    text = normalize_spaces(text)
    return text.strip(' -|')


def normalize_spaces(text=''):
    return re.sub(r'\s+', ' ', str(text or '')).strip()


def normalize_name(text=''):
    text = normalize_spaces(unquote(str(text or '')))
    text = text.replace('&amp;', '&')
    text = re.sub(r'\s*\|\s*.*$', '', text)
    return text.strip(' -|')


def is_arabic_text(text=''):
    return bool(re.search(r'[\u0600-\u06FF]', str(text or '')))


def is_latin_text(text=''):
    return bool(re.search(r'[A-Za-z]', str(text or '')))


def arabic_name_score(text=''):
    text = normalize_name(text)
    score = len(text)
    bonus_terms = ['مقهى', 'كافيه', 'كوفي', 'قهوة', 'مختصة', 'محمصة', 'كافي', 'لاونج']
    for term in bonus_terms:
        if term in text:
            score += 8
    if ' ' in text:
        score += 4
    return score


def pick_best_arabic_name(candidates):
    arabic_candidates = [normalize_name(c) for c in candidates if c and is_arabic_text(c)]
    if not arabic_candidates:
        return ''
    arabic_candidates = list(dict.fromkeys(arabic_candidates))
    return max(arabic_candidates, key=arabic_name_score)


def pick_best_english_name(candidates):
    english_candidates = [normalize_name(c) for c in candidates if c and is_latin_text(c)]
    if not english_candidates:
        return ''
    english_candidates = list(dict.fromkeys(english_candidates))
    return max(english_candidates, key=lambda c: (len(c), c))


def normalize_name_fields(extracted):
    candidates = [
        extracted.get('name', ''),
        extracted.get('_raw_name_candidate', ''),
        *extracted.get('_raw_name_candidates', [])
    ]

    arabic_candidate = pick_best_arabic_name(candidates)
    english_candidate = pick_best_english_name(candidates)

    if english_candidate:
        extracted['canonical_name_en'] = english_candidate
    if arabic_candidate:
        extracted['canonical_name_ar'] = arabic_candidate

    if arabic_candidate:
        extracted['name'] = arabic_candidate
        if english_candidate:
            extracted['alternate_name'] = english_candidate
    elif english_candidate:
        extracted['name'] = english_candidate
        extracted['canonical_name_en'] = english_candidate

    final_name = extracted.get('name', '')
    if final_name:
        extracted['slug'] = slugify(final_name if is_latin_text(final_name) else (english_candidate or final_name))

    extracted.pop('_raw_name_candidate', None)
    extracted.pop('_raw_name_candidates', None)
    return extracted


def extract_reviews_count(combined='', raw_lines=None):
    raw_lines = raw_lines or []

    patterns = [
        r'(?:reviews?|مراجعات|تقييمات?)\s*[:\-]?\s*([\d,]+)',
        r'([\d,]+)\s*(?:reviews?|مراجعات|تقييمات?)',
    ]
    for pattern in patterns:
        match = re.search(pattern, combined, re.I)
        if match:
            return match.group(1).replace(',', '')

    for line in raw_lines:
        if re.search(r'(reviews?|مراجعات|تقييمات?)', line, re.I):
            nums = re.findall(r'[\d,]+', line)
            nums = [n.replace(',', '') for n in nums if n.replace(',', '').isdigit()]
            if nums:
                best = max(nums, key=lambda n: (len(n), int(n)))
                if best:
                    return best
    return ''


def extract_fields(request):
    maps_url = str(request.get('maps_url') or '').strip()
    raw_text = str(request.get('raw_text') or '').strip()
    combined = f"{maps_url}\n{raw_text}".strip()
    extracted = {
        'reference_url': maps_url,
        'status': 'discovered',
        'confidence': 'low',
        'city': 'بريدة',
        'sector': 'cafes',
        'category': 'كافيه / مقهى'
    }

    name_match = re.search(r'/place/([^/?#]+)', maps_url, re.I)
    if name_match:
        name = clean_google_maps_name(name_match.group(1))
        if name:
            extracted['name'] = name

    raw_lines = [normalize_spaces(line) for line in raw_text.splitlines() if normalize_spaces(line)]
    useful_lines = [line for line in raw_lines if len(line) > 2 and not re.search(r'(review|reviews|مراجعة|مراجعات|تقييم|تقييمات|open|يغلق|يفتح|الاتجاهات|\$)', line, re.I)]
    if useful_lines:
        extracted['_raw_name_candidates'] = [normalize_name(line) for line in useful_lines]
        extracted['_raw_name_candidate'] = extracted['_raw_name_candidates'][0]
        if not extracted.get('name'):
            extracted['name'] = extracted['_raw_name_candidate']

    extracted = normalize_name_fields(extracted)

    rating_match = re.search(r'(?:^|[^\d])(\d\.\d)(?:[^\d]|$)', combined)
    if rating_match:
        extracted['google_rating'] = rating_match.group(1)

    reviews_count = extract_reviews_count(combined, raw_lines)
    if reviews_count:
        extracted['google_reviews_count'] = reviews_count

    price_match = re.search(r'(\$\$\$\$|\$\$\$|\$\$|\$|رخيص|متوسط السعر|مرتفع|باهظ)', combined, re.I)
    if price_match:
        extracted['price_level'] = price_match.group(1)

    plus_code_match = re.search(r'([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})', combined, re.I)
    if plus_code_match:
        extracted['short_address'] = plus_code_match.group(1)
    elif raw_lines:
        address_line = next((line for line in raw_lines if re.search(r'(طريق|شارع|حي|بريدة|النهضة|الريان|البساتين|الصفراء|سلطانة|قرطبة)', line)), '')
        if address_line:
            extracted['short_address'] = address_line

    return {k: v for k, v in extracted.items() if v not in ['', None]}


def build_patch_doc(request, extracted_fields):
    patch = dict(extracted_fields)
    patch.setdefault('source_notes', f"Import queue request {request.get('id')}")
    patch.setdefault('editorial_summary', 'Generated from import queue; needs human review before apply.')
    return {
        'slug': patch.get('slug', 'new-cafe-draft'),
        'exported_at': now_iso(),
        'mode': 'create_draft',
        'patch': patch
    }


def process_request(request):
    request_id = request.get('id') or f"import-{int(datetime.now().timestamp())}"
    processed_at = now_iso()
    extracted_fields = extract_fields(request)
    patch_path = None
    notes = []

    if extracted_fields:
        patch_doc = build_patch_doc(request, extracted_fields)
        patch_path_obj = PATCHES_DIR / f'{request_id}.proposed.patch.json'
        save_json(patch_path_obj, patch_doc)
        patch_path = str(patch_path_obj.relative_to(BASE_DIR)).replace('\\', '/')
        status = 'processed'
        notes.append('Extracted fields and generated proposed patch.')
    else:
        status = 'needs_review'
        notes.append('Could not extract enough fields; manual review needed.')

    result = {
        'request_id': request_id,
        'processed_at': processed_at,
        'status': status,
        'extracted_fields': extracted_fields,
        'notes': ' '.join(notes),
        'proposed_patch_path': patch_path or ''
    }
    result_path = RESULTS_DIR / f'{request_id}.result.json'
    save_json(result_path, result)

    request['processed_at'] = processed_at
    request['status'] = status
    request['result_path'] = str(result_path.relative_to(BASE_DIR)).replace('\\', '/')
    request['proposed_patch_path'] = patch_path or ''
    request['processing_notes'] = result['notes']
    return result


def main():
    queue = load_json(QUEUE_FILE)
    requests = queue.get('requests', [])
    processed = []

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    PATCHES_DIR.mkdir(parents=True, exist_ok=True)

    for request in requests:
        if request.get('status') == 'queued':
            processed.append(process_request(request))

    queue['updated_at'] = now_iso()
    save_json(QUEUE_FILE, queue)

    print(json.dumps({
        'processed_count': len(processed),
        'processed_request_ids': [item['request_id'] for item in processed]
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
