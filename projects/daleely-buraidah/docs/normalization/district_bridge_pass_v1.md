# District Bridge Pass v1

## Scope

- Bridge pass only between `data/master.json` and `data/city/buraydah_spatial_reference.json`.
- No direct change to `master.json`.
- No final canonical registry created in this pass.

## Executive Summary

- Total records reviewed: **207**
- Unique raw `district` values found: **20**
- Preliminary candidate rows: **11**
- Values kept unresolved for human review / non-district handling: **10**

## What exists in current district data

- Likely actual districts: **10** raw values
- Directional/general-area values: **5** raw values
- Placeholder/unknown values: **1** raw values
- Review-needed weak/close variants: **4** raw values

### Raw inventory snapshot

- `غير متحقق` — count 79 — `unknown_placeholder`
- `النهضة` — count 52 — `actual_district_likely`
- `الريان` — count 21 — `actual_district_likely`
- `البساتين` — count 12 — `actual_district_likely`
- `الرحاب` — count 8 — `actual_district_likely`
- `الصفراء` — count 6 — `actual_district_likely`
- `الأفق` — count 4 — `actual_district_likely`
- `جنوب بريدة` — count 4 — `directional_or_general_area`
- `سلطانة` — count 4 — `review_candidate_close_to_named_district`
- `قرطبة` — count 4 — `actual_district_likely`
- `شمال غرب بريدة` — count 3 — `directional_or_general_area`
- `شرق بريدة` — count 2 — `directional_or_general_area`
- `الإسكان` — count 1 — `actual_district_likely`
- `البصيرية` — count 1 — `review_candidate_weak_support`
- `التغيرة` — count 1 — `review_candidate_weak_support`
- `الحزم` — count 1 — `actual_district_likely`
- `السالمية` — count 1 — `review_candidate_weak_support`
- `المونسية` — count 1 — `actual_district_likely`
- `شمال بريدة` — count 1 — `directional_or_general_area`
- `غرب بريدة` — count 1 — `directional_or_general_area`

## Main duplication / convergence issues

- The dominant quality issue is semantic mixing rather than classic exact-duplicate spelling.
- `district` currently mixes named neighborhoods, directional city areas, and placeholder unknown values.
- The clearest near-canonical writing issue is `سلطانة` which may map to `السلطانة`, but this pass keeps it as a review candidate only.
- Directional values such as `جنوب بريدة` and `شمال غرب بريدة` should not be promoted into district canonicals.

## Likely actual districts from record-level evidence

- `النهضة` — count 52 — short-address support: 20 mentions, district-form support: 20.
- `الريان` — count 21 — short-address support: 10 mentions, district-form support: 10.
- `البساتين` — count 12 — short-address support: 10 mentions, district-form support: 9.
- `الرحاب` — count 8 — short-address support: 6 mentions, district-form support: 5.
- `الصفراء` — count 6 — short-address support: 6 mentions, district-form support: 5.
- `الأفق` — count 4 — short-address support: 4 mentions, district-form support: 4.
- `الحزم` — count 1 — short-address support: 1 mentions, district-form support: 1.
- `الإسكان` — count 1 — short-address support: 1 mentions, district-form support: 1.
- `المونسية` — count 1 — short-address support: 1 mentions, district-form support: 1.
- `قرطبة` — count 4 — short-address support: 4 mentions, district-form support: 2.

## Values that look like geo area / urban hint, not district truth

- `جنوب بريدة` — count 4 — keep as directional/geo-area hint only.
- `شمال غرب بريدة` — count 3 — keep as directional/geo-area hint only.
- `شرق بريدة` — count 2 — keep as directional/geo-area hint only.
- `غرب بريدة` — count 1 — keep as directional/geo-area hint only.
- `شمال بريدة` — count 1 — keep as directional/geo-area hint only.

## Human Review queue

- `سلطانة` → possible orthographic normalization to `السلطانة`, but hold for review.
- `التغيرة`, `السالمية`, `البصيرية` → weakly supported named values with too few records / too weak sourcing for automatic canonization.
- `غير متحقق` → operational placeholder, not a district.
- Mixed directional entries with embedded local hints in address text (example: one south-side record mentions `حي رواق`) should stay unresolved until handled by a separate field such as `district_hint` or `geo_area`.

## Readiness for next phase

- The bridge pass is sufficient to start a **District Canonical Registry Draft v1** only if the next phase remains conservative.
- Recommended next phase rules:
  1. Seed canonicals only from the likely-actual set with repeated record-level support.
  2. Keep directional values outside the canonical registry and route them to `geo_area` / `urban_zone_hint`.
  3. Keep `سلطانة`, `التغيرة`, `السالمية`, `البصيرية`, and any future one-off weak values behind human review gates.
