import json, csv, datetime, os, urllib.parse, urllib.request
root=r'C:\Users\hp\.openclaw\workspace'
out_csv=os.path.join(root,'buraydah_cafes_initial.csv')
out_md=os.path.join(root,'buraydah_cafes_summary.md')
query='''
[out:json][timeout:60];
(
  node["amenity"="cafe"](26.24,43.84,26.48,44.18);
  way["amenity"="cafe"](26.24,43.84,26.48,44.18);
  relation["amenity"="cafe"](26.24,43.84,26.48,44.18);
);
out center tags;
'''
url='https://overpass-api.de/api/interpreter'
data=urllib.parse.urlencode({'data':query}).encode('utf-8')
req=urllib.request.Request(url,data=data,method='POST')
with urllib.request.urlopen(req,timeout=120) as resp:
    payload=json.loads(resp.read().decode('utf-8'))
elements=payload.get('elements',[])
rows=[]
for e in elements:
    tags=e.get('tags',{})
    name_ar=tags.get('name:ar') or tags.get('name') or ''
    name_en=tags.get('name:en','')
    center=e.get('center') or {}
    lat=e.get('lat') or center.get('lat')
    lon=e.get('lon') or center.get('lon')
    if not lat or not lon:
        continue
    phone=tags.get('phone') or tags.get('contact:phone') or ''
    website=tags.get('website') or tags.get('contact:website') or ''
    insta=tags.get('contact:instagram') or ''
    x=tags.get('contact:x') or ''
    snap=tags.get('contact:snapchat') or ''
    tiktok=tags.get('contact:tiktok') or ''
    opening=tags.get('opening_hours','')
    addr=tags.get('addr:street') or tags.get('addr:full') or tags.get('addr:district') or ''
    brand=tags.get('brand','')
    category='سلاسل' if brand else 'مختص/كوفي'
    gmaps=f'https://maps.google.com/?q={lat},{lon}'
    pin=f'https://www.google.com/maps/search/?api=1&query={lat},{lon}'
    rows.append({
        'اسم المحل بالعربي':name_ar,
        'الاسم بالإنجليزي (إن وجد)':name_en,
        'التصنيف':category,
        'رقم/أرقام الاتصال':phone,
        'الموقع Google Maps URL':gmaps,
        'رابط Pin':pin,
        'الحي/العنوان المختصر':addr,
        'ساعات العمل لكل يوم (إن توفرت)':opening,
        'التقييم الرقمي':'Unverified',
        'عدد المراجعات':'Unverified',
        'روابط التواصل':'; '.join([v for v in [insta,x,snap,tiktok,website] if v]),
        'وسائل الطلب/التوصيل':'Unverified',
        'نطاق السعر':'Unverified',
        'أبرز المزايا':'Unverified',
        'حالة التحقق':'Verified' if name_ar else 'Unverified',
        'تاريخ آخر تحديث':datetime.date.today().isoformat(),
        'مصدر البيانات':'https://overpass-api.de/ + OpenStreetMap'
    })
seen=set(); ded=[]
for r in rows:
    key=((r['اسم المحل بالعربي'] or '').strip().lower(), r['الموقع Google Maps URL'])
    if key in seen: continue
    seen.add(key); ded.append(r)
if ded:
    fields=list(ded[0].keys())
    with open(out_csv,'w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(ded)
verified=sum(1 for r in ded if r['حالة التحقق']=='Verified')
with open(out_md,'w',encoding='utf-8') as f:
    f.write(f'count={len(ded)}\nverified={verified}\n')
print(json.dumps({'count':len(ded),'verified':verified,'csv':out_csv,'summary':out_md},ensure_ascii=False))

