import csv, os, json, datetime, collections
root=r'C:\Users\hp\.openclaw\workspace'
inp=os.path.join(root,'buraydah_cafes_initial.csv')
out=os.path.join(root,'buraydah_cafes_final_audited.csv')
qa=os.path.join(root,'buraydah_cafes_qa_report.md')
sumf=os.path.join(root,'buraydah_cafes_executive_summary.md')
rows=[]
with open(inp,'r',encoding='utf-8-sig') as f:
    rows=list(csv.DictReader(f))
# normalize + dedupe by arabic name + pin
seen=set(); final=[]
for r in rows:
    r={k:(v or '').strip() for k,v in r.items()}
    key=(r.get('اسم المحل بالعربي','').lower(), r.get('رابط Pin',''))
    if key in seen: continue
    seen.add(key)
    # enforce verification rule
    if not r.get('مصدر البيانات'): r['حالة التحقق']='Unverified'
    if not r.get('اسم المحل بالعربي'): r['حالة التحقق']='Unverified'
    final.append(r)
# QA checks
required=['اسم المحل بالعربي','الموقع Google Maps URL','رابط Pin','حالة التحقق','تاريخ آخر تحديث','مصدر البيانات']
errors=0
for r in final:
    for c in required:
        if not r.get(c):
            errors+=1
sample_size=min(10,len(final))
sample=final[:sample_size]
sample_errors=0
for r in sample:
    for c in required:
        if not r.get(c): sample_errors+=1
sample_fields=sample_size*len(required) if sample_size else 1
sample_error_rate=round((sample_errors/sample_fields)*100,2)
verified=sum(1 for r in final if r.get('حالة التحقق')=='Verified')
# neighborhood density (address proxy)
neigh=collections.Counter([r.get('الحي/العنوان المختصر') or 'غير متوفر' for r in final])
# top10 by rating unavailable
with open(out,'w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=list(final[0].keys()))
    w.writeheader(); w.writerows(final)
with open(qa,'w',encoding='utf-8') as f:
    f.write(f"records={len(final)}\nverified={verified}\nsample_error_rate={sample_error_rate}%\n")
with open(sumf,'w',encoding='utf-8') as f:
    f.write('# ملخص تنفيذي\n')
    f.write(f'- إجمالي عدد المقاهي المجمعة: {len(final)}\n')
    f.write(f'- نسبة السجلات Verified: {round((verified/len(final))*100,2) if final else 0}%\n')
    f.write('- أفضل 10 مقاهي حسب التقييم (حد أدنى مراجعات): Unavailable (ratings/reviews غير متاحة من المصدر الحالي)\n')
    f.write('- أكثر الأحياء كثافة بالمقاهي (حسب العنوان المتاح):\n')
    for k,v in neigh.most_common(5):
        f.write(f'  - {k}: {v}\n')
    f.write('- فجوات البيانات: التقييم/المراجعات/السعر/التوصيل/المزايا/سوشال لمعظم السجلات وتحتاج إثراء من Google Maps/Instagram الرسمي.\n')
print(json.dumps({'final_records':len(final),'verified':verified,'sample_error_rate':sample_error_rate,'out':out,'qa':qa,'summary':sumf},ensure_ascii=False))
