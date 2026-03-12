# Buraydah City Reference Audit

## Source
- **Title:** الرؤية العمرانية الشاملة لمدينة بريدة
- **Year:** 2019
- **Program:** برنامج مستقبل المدن السعودية / Future Saudi Cities Program
- **Partners:** وزارة الشؤون البلدية والقروية + UN-Habitat
- **Input artifact:** JSON extraction from the official report

## Purpose of this layer
This source is treated as a **City Knowledge Reference** for the project, not as entity truth.

It is suitable for:
- city context
- urban reasoning
- district normalization support
- opportunity mapping
- future sector expansion planning

It is **not** suitable for:
- direct edits to `data/master.json` entity records
- exact geocoding
- inventing districts/neighborhoods
- treating approximate values as final operational facts

---

## Files created from this source
- `data/city/buraydah_core.json`
- `data/city/buraydah_urban_model.json`
- `data/city/buraydah_spatial_reference.json`
- `data/city/buraydah_opportunity_zones.json`

---

## 1) Information adopted as usable reference
The following categories were accepted into the city reference layer:

### A. Core city facts
Accepted with clear certainty labels:
- city name / region
- report year and source identity
- built area 2018
- urban growth boundary 1450
- development protection boundary
- municipal structure (3 sub-municipalities / 68 sub-districts)
- approved land subdivisions
- population 2018 (preferred reported value: 621,212)
- population 2010 census
- age structure shares
- Saudi / non-Saudi ratio
- density indicators

### B. Urban structure
Accepted as structural city reference:
- urban zones (NW / S / SW / W / NE)
- development axes
- commercial centers
- strategic issues
- strategic directions

### C. Spatial hints useful for district reasoning
Accepted carefully:
- الرحاب
- الصفراء
- وسط المدينة القديم
- الديرة
- البصر

These are useful as **reference hints**, not as automatic district truth for entities.

### D. Opportunity logic
Accepted for planning use:
- محور الملك عبدالعزيز
- محور الملك فهد
- المركز التاريخي
- المركز الشمالي / الصفراء
- المنطقة الشمالية الغربية

These are useful for coverage planning and future sector prioritization.

---

## 2) Information treated as approximate / uncertain
The following were retained only with caution or metadata warnings:

### A. Approximate values
Examples:
- founded date (century-level only)
- elevation range
- rainfall values with multiple reported figures
- approximate city distances
- projected 2030+ population
- theoretical capacity values
- urban/periurban area and density ranges

### B. Directional / zone references
Examples:
- شمال غرب المدينة
- جنوب المدينة
- جنوب غرب المدينة
- غرب المدينة
- شمال شرق المدينة

These should **not** be inserted into `district` as if they were named neighborhoods.

### C. Approximate transport / accessibility logic
Examples:
- walk-access percentages to tram/BRT
- proposed transit lines
- opportunity corridor implications

These are strategic planning inputs, not operational entity facts.

---

## 3) Information intentionally not inserted into operational city data
The following were intentionally kept out of the structured operational reference files, except in summarized form when useful:

### A. Purely descriptive analysis
Examples:
- long narrative explanations of imbalance
- analytical commentary on urban fragmentation
- broad descriptive urban diagnosis paragraphs

### B. Policy and legislative recommendations
Examples:
- decentralization recommendations
- financial reform suggestions
- legal and governance prescriptions

These are useful for strategy discussion, but not needed in the city reference layer for current project operations.

### C. Raw statistics bulk dump
The `raw_statistics` block is useful as audit/support material, but was not copied wholesale into the structured layer.
Instead, only selected high-value fields were distilled into the new files.

### D. Entity-unsafe neighborhood assumptions
The report does **not** provide a complete official district list for Buraidah.
Therefore it was not used to fill missing `district` values in `master.json` directly.

---

## 4) Key limitations of the source
- no precise coordinates
- no complete district/neighborhood gazetteer
- no official neighborhood classification system
- no exact boundaries for urban zones
- no entity-level verification value by itself

---

## 5) Recommended next step for District Normalization
Recommended next step:

### District Normalization Bridge Pass
Create a lightweight bridge layer between:
- `data/master.json`
- `data/city/buraydah_spatial_reference.json`

The bridge should:
1. distinguish `district` from directional descriptors
2. introduce a helper concept such as `geo_area` or `urban_zone_hint`
3. use city-reference hints only when combined with address evidence
4. never auto-promote a directional value into a named district without supporting evidence

### Practical outcome
This would help resolve cases like:
- `شرق بريدة`
- `غرب بريدة`
- `جنوب بريدة`
- `شمال بريدة`

without corrupting `district` with invented neighborhood assignments.
