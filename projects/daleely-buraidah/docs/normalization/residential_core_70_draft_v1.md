# Residential Core 70 Draft v1

## Scope

- Built only from the attached external reference file as a draft reference layer.
- No change to `master.json`.
- No patch, no merge, no record-level action.

## Core-draft extraction rules

- Prioritized names with `has_detail` or presence in `neighborhoods_with_details`.
- Treated `S2` (residential guide) as a stronger residential signal than simple name-list presence.
- Used source count as reinforcement, not as final truth.
- Excluded names that look like plans, service/professional labels, workshop/industrial labels, airport-style labels, or generic area labels unless the file itself gave stronger residential proof.

## Result counts

- Entered Residential Core Draft: **47**
- Kept in Extended Reference: **18**
- Excluded as Non-core / Unclear: **70**

## Why names entered the core draft

- They carry one or more strong residential signals inside the file itself: detailed profile, residential-guide presence (S2), and repeated cross-source presence.
- This is still a draft reference layer, not an official final neighborhood registry.

## What stayed outside the core

- Some names stayed in the extended layer because they are plausible neighborhoods but lack enough strong residential evidence for core admission.
- Other names were excluded because they look like general zones, plans, industrial/workshop labels, or otherwise unclear canonical-neighborhood candidates.

## Is the core draft strong enough to become a future Neighborhood Canonical Base v1?

- **Partially yes.** It is strong enough as a draft seed/base candidate for later project use, but it should still pass one focused review before becoming the project's Neighborhood Canonical Base v1.
- The most reliable subset is the portion backed by `has_detail` and S2-supported multi-source presence.

## Sample of strongest core entries

- `الأخضر` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الأفق` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الجردة` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الربوة` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الرحاب` — high — detailed_neighborhood_profile — S1, S2, S3, S5
- `الرفيعة` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الريان` — high — detailed_neighborhood_profile — S1, S2, S3, S5
- `السادة` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `السالمية` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الشماس` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الصفراء` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الضاحي` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `العجيبة` — high — residential_guide_plus_map_match — S1, S2, S3, S5
- `الغدير` — high — detailed_neighborhood_profile — S1, S2, S3, S5
- `الفايزية` — high — residential_guide_plus_map_match — S1, S2, S3, S5