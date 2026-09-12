"""Build a portable HTML companion from the same evidence as Excel and SQLite."""
import json
import argparse
import csv
from html import escape as esc
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='Export the dated agent comparison and questionnaire as offline HTML and CSV.')
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True)
data = json.loads((root / 'references/capabilities-data.json').read_text())
sources = {s['id']: s for s in data['sources']}
entries = {(e['product'], e['capability_id']): e for e in data['evidence']}
def refs(ids):
    return ' '.join(f'<a href="{esc(sources[i]["url"], quote=True)}" target="_blank" rel="noopener noreferrer" title="{esc(sources[i]["title"], quote=True)}">{i}</a>' for i in ids)

products = ''.join(f'<label class="chip"><input type="checkbox" value="{p["id"]}" checked><span>{esc(p["name"])}</span></label>' for p in data['products'])
roles = ''.join(f'<div class="role"><strong>{esc(p["name"])}</strong><span>{esc(p["role"])}</span></div>' for p in data['products'])
sections = []
ordered = sorted(data['capabilities'], key=lambda c: (c['category'] != 'Commerce', [x['id'] for x in data['capabilities']].index(c['id'])))
for c in ordered:
    cards=[]
    for p in data['products']:
        e=entries[p['id'], c['id']]
        cards.append(f'''<article class="evidence" data-product="{p['id']}">
<div class="card-head"><h3>{esc(p['name'])}</h3><span class="badge {e['status_code']}">{esc(e['status'])}</span></div>
<p class="claim">{esc(e['claim'])}</p><p class="limit">{esc(e['limitations'])}</p>
<footer>{refs(e['sources'])}<span>Checked {e['checked']}</span></footer></article>''')
    sections.append(f'''<details class="capability" data-category="{esc(c['category'])}" {'open' if c['id']=='pay' else ''}>
<summary><span class="category">{esc(c['category'])}</span><h2>{esc(c['name'])}</h2><span class="expand" aria-hidden="true">+</span></summary>
<div class="evidence-grid">{''.join(cards)}</div></details>''')
changes=''.join(f'<tr><td>{esc(r[0])}</td><td>{esc(r[2])}</td><td><strong>{esc(r[3])}</strong><br>{esc(r[4])}<p class="limit">{esc(r[7])}</p></td><td>{refs(r[6].split())}</td></tr>' for r in data['changes'])
qualifications=''.join(f'<div class="qualification"><h3>{esc(r[0])}</h3><p>{esc(r[1])} {refs(r[2].split())}</p></div>' for r in data['details'])
source_rows=''.join(f'<tr><td>{s["id"]}</td><td><a href="{esc(s["url"],quote=True)}" target="_blank" rel="noopener noreferrer">{esc(s["title"])}</a><p class="limit">{esc(s["note"])}</p></td><td>{esc(s["kind"])}</td><td>{s["accessed"]}</td></tr>' for s in data['sources'])
prices=''.join(f'<tr><td>{esc(r[0])}</td><td>{esc(r[1])}</td><td>{("—" if r[2] is None else format(r[2],".10g"))}<br><span class="limit">{esc(r[3])}</span></td><td>{"—" if r[4] is None else format(r[4],".10g")} {esc(r[5])}</td><td>{esc(r[7])} {refs([r[6]])}</td></tr>' for r in data['prices'])
template='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Browser & computer agents · Capability overview</title>
<meta name="description" content="32 capabilities across 11 agent surfaces, with dated evidence, source links, pricing and operational caveats.">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23111e38'/%3E%3Cpath d='M8 10h16M8 16h10M8 22h16' stroke='%2377ddff' stroke-width='3'/%3E%3C/svg%3E">
<style>
:root{color-scheme:light;--ink:#14233d;--muted:#506078;--line:#dce3ec;--blue:#1649bd;--surface:#f3f6fb}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--blue);text-underline-offset:3px}button,input,select{font:inherit}button,select,.search{border:1px solid #acb8ca;border-radius:7px;background:white;padding:9px 12px;color:var(--ink)}button{cursor:pointer}button:hover{background:#eaf0ff}button:focus-visible,a:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #3989ed;outline-offset:4px}[hidden]{display:none!important}.masthead{background:#111e38;color:#fff;border-bottom:5px solid #6bd1ff}.wrap{max-width:1480px;padding:28px 36px;margin:auto}.top{display:flex;justify-content:space-between;align-items:center;gap:24px}.eyebrow{text-transform:uppercase;letter-spacing:.13em;font-size:12px;color:#a6c9ff;font-weight:700;margin:0 0 7px}h1{font-size:clamp(26px,3vw,38px);letter-spacing:-.035em;line-height:1.2;margin:0}h2{font-size:20px;margin:0;line-height:1.3}h3{font-size:16px;margin:0}.date{font-size:14px;color:#bdcce2;margin:12px 0 0}.downloads{display:flex;gap:12px;flex-wrap:wrap}.downloads a{color:#fff;font-size:14px;border:1px solid #526581;padding:8px 14px;border-radius:5px;text-decoration:none}.stats{display:flex;gap:28px;flex-wrap:wrap;margin:20px 0 0;color:#c8d7ed;font-size:14px}.stats b{font-size:23px;font-weight:650;color:#fff;margin-right:6px}.intro{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:24px}.insight{border-left:3px solid #2876d8;padding-left:15px}.insight p{margin:6px 0;font-size:15px;color:var(--muted)}.tools{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:20px;margin:22px 0}.tools h2{margin-bottom:15px}.search-row{display:flex;gap:15px;align-items:end;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:5px;font-size:14px}.field:first-child{flex:1;min-width:210px}.search{width:100%}.products{border:0;padding:0;margin:18px 0 0}.products legend{font-size:14px;font-weight:650;margin-bottom:9px}.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{display:flex;gap:7px;align-items:center;border:1px solid #b5c4da;padding:7px 10px;border-radius:6px;cursor:pointer;background:#fff;font-size:14px}.chip:has(input:checked){border-color:#3574ca;background:#e9f2ff}.chip input{accent-color:#1649bd;width:16px;height:16px;margin:0}.small-actions{display:flex;gap:12px;align-items:center;margin-top:12px;font-size:14px;flex-wrap:wrap}.small-actions button{padding:4px 9px;font-size:14px}.legend{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:16px 0;font-size:14px}.badge{display:inline-block;font-size:12px;font-weight:650;border-radius:4px;padding:3px 7px;background:#edf0f4;color:#3e4a5e}.D{background:#e0f2f0;color:#07554e}.P{background:#fff0ce;color:#734c03}.I{background:#e9edfc;color:#3e4894}.V{background:#e5efff;color:#164c94}.R{background:#fae9ee;color:#82334f}.A{background:#fff0ce;color:#734c03}.U{background:#eceff3;color:#48546a}.caption{font-size:14px;color:var(--muted)}.capability{border:1px solid var(--line);border-radius:8px;margin:10px 0;overflow:hidden}.capability>summary{display:flex;align-items:center;gap:18px;padding:18px 20px;cursor:pointer;list-style:none}.capability>summary::-webkit-details-marker{display:none}.category{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);min-width:96px}.expand{margin-left:auto;font-size:24px;line-height:1}.capability[open] .expand{transform:rotate(45deg)}.capability[open]>summary{background:var(--surface);border-bottom:1px solid var(--line)}.evidence-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line)}.evidence{background:#fff;padding:20px;min-width:0}.card-head{display:flex;flex-wrap:wrap;align-items:center;gap:9px;justify-content:space-between}.claim{margin:14px 0 6px}.limit{color:var(--muted);font-size:14px;margin:5px 0;overflow-wrap:anywhere}footer{display:flex;flex-wrap:wrap;gap:8px;font-size:12px;margin-top:15px}footer span{margin-left:auto;color:var(--muted)}.appendix{margin-top:34px;border-top:2px solid #243959;padding-top:20px}.appendix>summary{font-size:20px;font-weight:650;cursor:pointer}.roles{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:20px 0}.role{display:flex;flex-direction:column;gap:5px}.role span{font-size:14px;color:var(--muted)}.table-scroll{overflow-x:auto;margin-top:18px}table{width:100%;border-collapse:collapse;min-width:650px;font-size:14px;text-align:left}th{background:var(--surface);font-size:12px;text-transform:uppercase;letter-spacing:.04em}th,td{padding:14px 12px;border-bottom:1px solid var(--line);vertical-align:top}th:first-child,td:first-child{white-space:nowrap}.qualification{padding:16px 0;border-bottom:1px solid var(--line)}.qualification p{margin:8px 0;max-width:1050px;font-size:15px}.end{border-top:1px solid var(--line);padding:20px 0;margin-top:28px;font-size:14px;color:var(--muted)}#empty{padding:24px;background:var(--surface);border-radius:8px}noscript p{padding:15px;background:#fff0ce}@media(max-width:1000px){.evidence-grid,.roles{grid-template-columns:repeat(2,minmax(0,1fr))}.top{align-items:start;flex-direction:column}.intro{gap:16px}}@media(max-width:650px){.wrap{padding:22px 16px}.intro,.evidence-grid,.roles{grid-template-columns:1fr}.intro{gap:18px}.stats{gap:15px}.capability>summary{flex-wrap:wrap;gap:7px;padding:15px}.category{min-width:0;width:100%}.capability h2{font-size:18px;flex:1}.evidence{padding:17px}.tools{padding:15px}.small-actions{gap:8px}}@media print{.tools,.downloads,.small-actions{display:none}.masthead{background:white;color:#14233d}.masthead *{color:#14233d!important}.wrap{padding:14px 0}.evidence{break-inside:avoid}.evidence-grid{grid-template-columns:repeat(2,1fr)}a{color:inherit}.appendix{break-before:auto}}
</style></head><body>
<header class="masthead"><div class="wrap"><div class="top"><div><p class="eyebrow">Research notebook / agent capabilities</p><h1>Browser & computer agents</h1><p class="date">Baseline: September 10, 2026 · Browserbase / Stagehand added September 11</p></div><nav class="downloads" aria-label="Companion files"><a href="capability-evidence.csv" download>CSV</a></nav></div><div class="stats"><span><b>6</b>providers</span><span><b>11</b>surfaces</span><span><b>32</b>capabilities</span><span><b>352</b>evidence entries</span><span><b>58</b>sources</span></div></div></header>
<main class="wrap"><section class="intro" aria-label="Key findings"><div class="insight"><h3>Purchases are already possible</h3><p>Wallet integrations, virtual-card examples and approval policies differ. Reaching checkout is not proof of an order.</p></div><div class="insight"><h3>Keep product surfaces separate</h3><p>A hosted browser, an SDK and a managed agent have different responsibilities—even from the same provider.</p></div><div class="insight"><h3>Evidence is not a success rate</h3><p>No hands-on tests were run. Documentation, vendor claims, conditions and unknowns are labeled separately.</p></div></section>
<section class="tools" aria-labelledby="compare-title"><h2 id="compare-title">Compare capabilities</h2><div class="search-row"><label class="field">Find a capability or claim<input id="search" class="search" type="search" placeholder="Payments, CAPTCHA, memory…"></label><label class="field">Category<select id="category" aria-label="Category"><option value="">All categories</option>__CATEGORIES__</select></label></div><fieldset class="products"><legend>Product surfaces</legend><div class="chips">__PRODUCTS__</div></fieldset><div class="small-actions"><button id="all" type="button">Select all</button><button id="browserbase" type="button">Browserbase / Stagehand</button><button id="clear" type="button">Clear selection</button><button id="reset" type="button">Reset filters</button></div></section>
<div class="legend" aria-label="Evidence legend">__LEGEND__</div><p class="caption" id="count" role="status" aria-live="polite">32 capabilities · 11 surfaces selected</p><p class="caption">Open a capability to compare claims and limits. Source IDs link directly to the supporting pages. “Not established” means a research gap.</p><noscript><p>JavaScript is disabled. All evidence remains available below; filters require JavaScript.</p></noscript>
<div id="empty" hidden>No matches. Try another search, category or product selection.</div><section id="comparison" aria-label="Capability evidence">__SECTIONS__</section>
<details class="appendix"><summary>What each product surface provides</summary><div class="roles">__ROLES__</div></details>
<details class="appendix"><summary>Pricing and allowances</summary><p class="caption">USD. Original providers checked September 10; Browserbase / Stagehand September 11. Billing units differ; no cost-per-success ranking is calculated. A dash means no numeric rate was established.</p><div class="table-scroll"><table><thead><tr><th>Product</th><th>Item</th><th>Amount / unit</th><th>Secondary amount / meaning</th><th>Qualification</th></tr></thead><tbody>__PRICES__</tbody></table></div></details>
<details class="appendix"><summary>Recent changes</summary><p class="caption">Event dates may differ from publication dates and local time. Undated current documentation is not treated as a new release.</p><div class="table-scroll"><table><thead><tr><th>Event date</th><th>Product</th><th>Change and qualification</th><th>Sources</th></tr></thead><tbody>__CHANGES__</tbody></table></div></details>
<details class="appendix"><summary>Qualifications and research method</summary>__QUALIFICATIONS__</details>
<details class="appendix"><summary>Source register · 58 records</summary><div class="table-scroll"><table><thead><tr><th>ID</th><th>Source and caveat</th><th>Evidence type</th><th>Accessed</th></tr></thead><tbody>__SOURCES__</tbody></table></div></details>
<p class="end">A dated research snapshot, not a live monitor. No accounts created, money spent, CAPTCHA trials performed or independent security audit conducted. This HTML and its CSV use the bundled, dated research snapshot. Recheck primary sources before relying on a recommendation.</p></main>
<script>
const boxes=[...document.querySelectorAll('.products input')];
const groups=[...document.querySelectorAll('.capability')];
const query=document.getElementById('search'),category=document.getElementById('category');
function filter(){
 const selected=new Set(boxes.filter(b=>b.checked).map(b=>b.value));
 const needle=query.value.trim().toLocaleLowerCase();let count=0;
 for(const group of groups){
  let matches=0;const title=group.querySelector('summary').textContent.toLocaleLowerCase();
  for(const card of group.querySelectorAll('.evidence')){
   const show=selected.has(card.dataset.product)&&(!needle||title.includes(needle)||card.textContent.toLocaleLowerCase().includes(needle));
   card.hidden=!show;if(show)matches++;
  }
  group.hidden=!matches||(category.value&&category.value!==group.dataset.category);
  if(!group.hidden){count++;if(needle)group.open=true;}
 }
 document.getElementById('count').textContent=`${count} ${count===1?'capability':'capabilities'} · ${selected.size} ${selected.size===1?'surface':'surfaces'} selected`;
 document.getElementById('empty').hidden=count!==0;
}
boxes.forEach(b=>b.addEventListener('change',filter));query.addEventListener('input',filter);category.addEventListener('change',filter);
document.getElementById('all').onclick=()=>{boxes.forEach(b=>b.checked=true);filter()};
document.getElementById('clear').onclick=()=>{boxes.forEach(b=>b.checked=false);filter()};
document.getElementById('browserbase').onclick=()=>{boxes.forEach(b=>b.checked=['bb_browser','bb_agents','stagehand'].includes(b.value));filter()};
document.getElementById('reset').onclick=()=>{boxes.forEach(b=>b.checked=true);query.value='';category.value='';groups.forEach((g,i)=>g.open=i===0);filter()};
</script></body></html>'''
values={'CATEGORIES':''.join(f'<option>{esc(c)}</option>' for c in dict.fromkeys(c['category'] for c in data['capabilities'])), 'PRODUCTS':products,'SECTIONS':''.join(sections),'ROLES':roles,'CHANGES':changes,'PRICES':prices,'QUALIFICATIONS':qualifications,'SOURCES':source_rows,'LEGEND':''.join(f'<span class="badge {k}">{esc(v)}</span>' for k,v in data['status_names'].items())}
for key,value in values.items():
    template=template.replace('__'+key+'__',value)
guide=(root/'assets/decision-guide.html').read_text()
# The guide shares the matrix's existing filter controls. Run its script after
# those controls are initialized, while placing its working surface first.
guide_markup, guide_script = guide.split('<script>', 1)
template=template.replace('<main class="wrap">', '<main class="wrap">'+guide_markup, 1)
template=template.replace('</body>', '<script>'+guide_script+'</body>', 1)
(out/'agent-capabilities.html').write_text(template)
print(f'HTML overview written: {len(data["evidence"])} evidence entries, {len(data["sources"])} sources')

with (out/'capability-evidence.csv').open('w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['product','category','capability','status','claim','limitations','checked','sources'])
    names = {p['id']:p['name'] for p in data['products']}
    for e in data['evidence']:
        writer.writerow([names[e['product']],e['category'],e['capability'],e['status'],e['claim'],e['limitations'],e['checked'],' | '.join(sources[i]['url'] for i in e['sources'])])
