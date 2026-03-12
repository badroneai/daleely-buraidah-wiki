# District Canonical Registry Draft v1

## Scope

- Draft registry only. No edit to `master.json`.
- No patch produced in this round.
- Canonicals included only when supported from the records themselves in the previous bridge pass.

## Ready canonicals (draft)

- `النهضة` — support_count: 52 — confidence: `high` — aliases: None yet
- `الريان` — support_count: 21 — confidence: `high` — aliases: None yet
- `البساتين` — support_count: 12 — confidence: `high` — aliases: None yet
- `الرحاب` — support_count: 8 — confidence: `high` — aliases: None yet
- `الصفراء` — support_count: 6 — confidence: `high` — aliases: None yet
- `الأفق` — support_count: 4 — confidence: `high` — aliases: None yet
- `قرطبة` — support_count: 4 — confidence: `high` — aliases: None yet
- `الإسكان` — support_count: 1 — confidence: `medium` — aliases: None yet
- `الحزم` — support_count: 1 — confidence: `medium` — aliases: None yet
- `المونسية` — support_count: 1 — confidence: `medium` — aliases: None yet

## Alias policy in this draft

- This draft is intentionally conservative: no weak spelling variant was auto-merged unless already proven by raw support.
- Therefore most canonicals currently carry **no accepted aliases yet**.
- `سلطانة` was **not** merged into `السلطانة`; it remains in hold pending human review.

## Directional values excluded from canonical district

- `جنوب بريدة` — count 4 — excluded because it is directional/geo-area only.
- `شمال غرب بريدة` — count 3 — excluded because it is directional/geo-area only.
- `شرق بريدة` — count 2 — excluded because it is directional/geo-area only.
- `غرب بريدة` — count 1 — excluded because it is directional/geo-area only.
- `شمال بريدة` — count 1 — excluded because it is directional/geo-area only.

## Hold values pending human review

- `سلطانة` — count 4 — `human_review_required` — priority `high`
- `البصيرية` — count 1 — `human_review_required` — priority `medium`
- `التغيرة` — count 1 — `human_review_required` — priority `medium`
- `السالمية` — count 1 — `human_review_required` — priority `medium`
- `غير متحقق` — count 79 — `placeholder_non_district` — priority `medium`

## Is the data sufficient for a future Neighborhood Normalization Pass on master?

- **Partially yes.** The data is sufficient to start a conservative *Neighborhood Normalization Pass v1 (Draft Patch Only)* for the ready canonicals.
- It is **not** sufficient for blanket normalization across all district values.
- Safe future scope would be limited to the ready canonical set, while directional values and hold values remain untouched.

## Notes

- Strongest canonicals by repeated support: `النهضة`, `الريان`, `البساتين`, `الرحاب`, `الصفراء`.
- Mid-strength canonicals: `الأفق`, `قرطبة`.
- Low-volume but direct-address canonicals kept in draft only: `الإسكان`, `الحزم`, `المونسية`.
- Main unresolved writing issue remains `سلطانة` vs `السلطانة`.