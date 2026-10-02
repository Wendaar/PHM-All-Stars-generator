import { SCHEMA, LIMITS, detectMappings, importData, groupsOf, nominate, toggleSelection, monthBounds, sheetRowsToObjects } from './domain.js?v=teams-positions-2';
import { demoSnapshot } from './demo.js';
import { escapeHTML as e, graphicHTML, exportPNG, exportDocument } from './graphics.js?v=brand-fonts-1';
const $=id=>document.getElementById(id),STORE='phm-all-stars-v1',empty=()=>({F:[],D:[],G:[]});
let snapshots=[demoSnapshot()],saved={},role='F',result=null,pending=null,mappings=null,documentExport='';
let defaultId='demo';
try {const response=await fetch(new URL('./data/2026-09.json',import.meta.url));if(response.ok){const real=await response.json();real.bundled=true;snapshots.push(real,{...real,id:`${real.id}-baseline`,mode:'cumulative',baselineOnly:true,label:'Výchozí uzávěrka 2. 10. 2026'});defaultId=real.id;}}catch{}
try { const data=JSON.parse(localStorage.getItem(STORE)||'null');if(data?.schema===1&&Array.isArray(data.snapshots)){snapshots=[...snapshots,...data.snapshots.filter(s=>s.data&&!s.demo&&!s.bundled)];saved=data.selections||{};} }catch{}
const current=()=>snapshots.find(s=>s.id===$('snapshot').value)||snapshots[0];
const selectionKey=()=>`${current().id}|${$('month').value}|${$('division').value}`;
const selection=()=>saved[selectionKey()]||empty();
function resolveCandidate(list,entry){const id=typeof entry==='string'?entry:entry.id;const exact=list.find(p=>p.id===id);if(exact)return exact;const matches=list.filter(p=>p.playerId===id&&(!entry.teamId||p.teamId===entry.teamId)&&(!entry.team||p.team===entry.team));return matches.length===1?matches[0]:null;}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5500);}
function persist(){try{localStorage.setItem(STORE,JSON.stringify({schema:1,snapshots:snapshots.filter(s=>!s.demo&&!s.bundled),selections:saved}));}catch{toast('Úložiště prohlížeče je plné. Exportujte sestavu do JSON; data zůstanou dostupná do zavření stránky.');}}
function sources(id){$('snapshot').innerHTML=snapshots.filter(s=>!s.baselineOnly).map(s=>`<option value="${e(s.id)}">${e(s.label)} · ${e(s.mode==='monthly'?s.month:s.asOf)}</option>`).join('');if(id)$('snapshot').value=id;divisions();}
function divisions(){const old=$('division').value;$('division').innerHTML=groupsOf(current()).map(g=>`<option>${e(g)}</option>`).join('');if(groupsOf(current()).includes(old))$('division').value=old;}
function playerSelection(){const ids=selection();return Object.fromEntries(['F','D','G'].map(r=>[r,ids[r].map(id=>result?.[r].find(p=>p.id===id)).filter(Boolean)]));}
function graphicOptions(){return {demo:!!current().demo,groupLogo:current().data.Groups.find(g=>g.name===$('division').value)?.logo||'',periodException:current().periodException||null,asOf:current().asOf};}
function render(){
 const month=$('month').value;if(!/^\d{4}-\d{2}$/.test(month)){toast('Vyberte měsíc.');return;}
 const bounds=monthBounds(month),s=current(),sameSeason=x=>x.season.replace(/[^\d]/g,'')===s.season.replace(/[^\d]/g,'');
 const previous=snapshots.find(x=>x.asOf===bounds.before&&x.mode==='cumulative'&&sameSeason(x))||snapshots.find(x=>x.baselineOnly&&x.periodException?.approved&&x.periodException.creditedMonth===bounds.before.slice(0,7)&&x.asOf>bounds.before&&x.asOf<bounds.end&&sameSeason(x));
 try{result=nominate(s,previous,month,$('division').value);}catch(error){result={F:[],D:[],G:[],warnings:[error.message],issues:[],games:0,ready:false};}
 // Stored selections are reconciled against current candidates before export.
 const clean=selection();let changed=false,ambiguous=false;for(const r of ['F','D','G']){const valid=clean[r].map(id=>{const p=resolveCandidate(result[r],id);if(!p)ambiguous=true;return p?.id;}).filter(Boolean);if(JSON.stringify(valid)!==JSON.stringify(clean[r])){clean[r]=valid;changed=true;}}if(changed){saved[selectionKey()]=clean;persist();if(ambiguous)toast('Část staršího výběru nelze přiřadit k jednomu týmu. Vyberte tyto hráče znovu, nebo načtěte uložený JSON sestavy.');}
 $('source-label').textContent=s.demo?'DEMO · smyšlená data':`${s.season} · ${s.periodException?.approved&&s.mode==='monthly'?'zářijový výběr · schválená výjimka':s.mode==='monthly'?'měsíční export':'rozdíl uzávěrek'}`;
 $('notice').textContent=s.demo?'Pracujete s ukázkovými daty. Pro skutečné nominace nahrajte HMS export.':(result.ready&&!s.periodException?.approved?'Statistiky odpovídají potvrzenému období. ':'')+result.warnings.filter(w=>!w.startsWith('Každý hráč')).join(' ');
 $('quality').innerHTML=[...result.warnings,...result.issues].map(w=>`<li>${e(w)}</li>`).join('');
 $('games-count').textContent=`${result.games} zápasů ${s.periodException?.approved?'v zářijovém výběru':'v měsíci'}`;
 document.querySelectorAll('[data-role]').forEach(button=>{button.classList.toggle('active',button.dataset.role===role);button.setAttribute('aria-pressed',String(button.dataset.role===role));button.querySelector('span').textContent=`${selection()[button.dataset.role].length} / ${LIMITS[button.dataset.role]}`;});
 const all=result[role],limit=LIMITS[role]*3,display=$('all-candidates').checked?all:all.slice(0,limit);
 $('list-description').textContent=role==='G'&&all.every(p=>p.manual)?'Ruční výběr · bez pořadí':`Shortlist · ${Math.min(limit,all.length)} z ${all.length} kandidátů`;
 $('candidates').innerHTML=display.length?display.map(p=>{
  const selected=selection()[role].includes(p.id),rank=all.indexOf(p)+1;
  const metrics=p.manual?'Statistiky brankáře nejsou dostupné':role==='G'?`${(p.sv*100).toFixed(1)} % zákroků · ${p.ga} GA · ${p.so??'—'} SO`:`${p.points} bodů · ${p.goals} G + ${p.assists} A · ${p.gp} zápasy`;
  const reason=p.manual?'Jonášův ruční výběr':`${Math.round(p.coverage*100)} % zápasů týmu · ${p.stars??'—'} hvězdy${p.eligible?'':' · nesplňuje většinu zápasů'}${p.positionUnverified?' · pozice neověřena · nabídnut v útoku i obraně':role==='D'?' · preferovaná pozice D':''}`;
  return `<button class="candidate ${selected?'selected':''}" data-player="${e(p.id)}" aria-pressed="${selected}"><span class="rank">${p.manual?'G':String(rank).padStart(2,'0')}</span><span><strong>${e(p.name)}</strong><span class="team">${e(p.team)}</span><span class="metrics">${e(metrics)}</span><span class="reason">${e(reason)}</span></span><span class="check">${selected?'✓':'+'}</span></button>`;
 }).join(''):`<div class="empty">${result.ready?'Pro tuto pozici a období nejsou použitelní kandidáti. Zkontrolujte pozice a podklady.':'Nejprve doplňte správné podklady pro tento měsíc.'}</div>`;
 const players=playerSelection(),count=Object.values(players).flat().length;$('progress').textContent=`${count} / 6 vybráno`;
 $('graphic').innerHTML=graphicHTML(players,month,$('division').value,$('format').value,graphicOptions());
 $('graphic').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(img.parentElement.classList.contains('portrait-wrap'))img.replaceWith(document.createTextNode(img.alt.split(' ').slice(0,2).map(v=>v[0]).join('')));else img.remove();}));
 for(const id of ['png','html','json'])$(id).disabled=count!==6;
}
function download(blob,filename){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function filename(extension){return `PHM-All-Stars-${$('division').value.replace(/\s+/g,'-')}-${$('month').value}.${extension}`;}
for(const id of ['month','division','format','all-candidates'])$(id).addEventListener('change',render);
 $('snapshot').addEventListener('change',()=>{divisions();const s=current();$('month').value=s.mode==='monthly'?s.month:s.asOf.slice(0,7);render();});
document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{role=b.dataset.role;render();}));
$('candidates').addEventListener('click',event=>{const button=event.target.closest('[data-player]');if(!button)return;try{saved[selectionKey()]=toggleSelection(selection(),result[role].find(p=>p.id===button.dataset.player));persist();render();}catch(error){toast(error.message);}});
$('clear').addEventListener('click',()=>{saved[selectionKey()]=empty();persist();render();});
$('demo').addEventListener('click',()=>{sources('demo');$('month').value='2026-09';render();});
$('open-import').addEventListener('click',()=>$('import-dialog').showModal());
$('import-month').addEventListener('change',()=>{if($('import-month').value)$('as-of').value=monthBounds($('import-month').value).end;});
function mappingFields(){ $('mapping-fields').innerHTML=Object.keys(SCHEMA).filter(s=>pending[s]?.length).map(sheet=>{const headers=Object.keys(pending[sheet][0]);return `<fieldset><legend>${sheet} · ${pending[sheet].length} řádků</legend>${Object.keys(SCHEMA[sheet]).map(field=>`<label>${field}<select data-sheet="${sheet}" data-field="${field}"><option value="">Nenalezeno / nepoužít</option>${headers.map(h=>`<option value="${e(h)}" ${mappings[sheet][field]===h?'selected':''}>${e(h)}</option>`).join('')}</select></label>`).join('')}</fieldset>`;}).join('');}
$('mapping-fields').addEventListener('change',event=>{const el=event.target;mappings[el.dataset.sheet][el.dataset.field]=el.value;});
$('file').addEventListener('change',async()=>{
 pending=null;$('commit-import').disabled=true;$('confirm-scope').checked=false;
 try{const file=$('file').files[0];if(!file)return;if(file.size>30*1024*1024)throw Error('MVP přijímá exporty do 30 MB.');$('import-status').textContent='Načítám soubor…';const workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
  pending={};for(const sheet of Object.keys(SCHEMA)){const actual=workbook.SheetNames.find(n=>n.trim().toLowerCase()===sheet.toLowerCase());if(actual)pending[sheet]=sheetRowsToObjects(sheet,window.XLSX.utils.sheet_to_json(workbook.Sheets[actual],{header:1,defval:''}));}
  mappings=detectMappings(pending);mappingFields();$('mapping').open=true;$('commit-import').disabled=false;$('import-status').textContent='Zkontrolujte mapování sloupců a potvrďte období exportu.';
 }catch(error){$('import-status').textContent=`Import selhal: ${error.message}`;}
});
$('commit-import').addEventListener('click',()=>{
 try{if(!$('confirm-scope').checked)throw Error('Potvrďte období statistik.');if(!$('season').value.trim()||!$('import-month').value||!$('as-of').value)throw Error('Vyplňte sezonu, měsíc a uzávěrku.');
  const snapshot=importData(pending,mappings,{id:crypto.randomUUID(),label:$('file').files[0].name,mode:$('mode').value,month:$('import-month').value,asOf:$('as-of').value,season:$('season').value.trim(),demo:false});
  // A replacement must not accidentally become a second baseline of the same cutoff.
  snapshots=snapshots.filter(s=>s.demo||s.season!==snapshot.season||s.mode!==snapshot.mode||(snapshot.mode==='monthly'?s.month!==snapshot.month:s.asOf!==snapshot.asOf));snapshots.push(snapshot);persist();sources(snapshot.id);$('month').value=snapshot.month;$('import-dialog').close();render();toast('Export načten. Zkontrolujte upozornění k datům.');
 }catch(error){$('import-status').textContent=error.message;}
});
$('png').addEventListener('click',async()=>{const button=$('png');button.disabled=true;button.textContent='Připravuji PNG…';try{const {blob,missing}=await exportPNG(playerSelection(),$('month').value,$('division').value,$('format').value,graphicOptions());if(!blob)throw Error('PNG se nepodařilo vytvořit.');download(blob,filename('png'));toast(missing.length?`PNG uložené. Nenahrané obrázky nahrazeny iniciálami / textem: ${missing.join(', ')}.`:'PNG připravené.');}catch(error){toast(error.message);}finally{button.textContent='Stáhnout PNG';render();}});
$('html').addEventListener('click',async()=>{try{documentExport=await exportDocument(playerSelection(),$('month').value,$('division').value,$('format').value,graphicOptions());$('embed-code').value=`<iframe title="PHM All Stars" style="width:100%;aspect-ratio:${$('format').value==='portrait'?'9/16':'16/10'};border:0" sandbox="" srcdoc="${e(documentExport)}"></iframe>`;$('embed-dialog').showModal();}catch(error){toast(`HTML export selhal: ${error.message}`);}});
$('copy-embed').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('embed-code').value);toast('Kód zkopírovaný.');}catch{$('embed-code').select();toast('Označený kód zkopírujte ručně.');}});
$('download-html').addEventListener('click',()=>download(new Blob([documentExport],{type:'text/html;charset=utf-8'}),filename('html')));
$('json').addEventListener('click',()=>download(new Blob([JSON.stringify({schema:1,month:$('month').value,division:$('division').value,format:$('format').value,demo:!!current().demo,asOf:current().asOf,periodException:current().periodException||null,selection:playerSelection()},null,2)],{type:'application/json'}),filename('json')));
$('load-selection').addEventListener('change',async()=>{try{
 const file=$('load-selection').files[0];if(!file)return;if(file.size>1024*1024)throw Error('Soubor sestavy je příliš velký.');const data=JSON.parse(await file.text());if(data.schema!==1||!/^\d{4}-\d{2}$/.test(data.month)||!groupsOf(current()).includes(data.division))throw Error('Sestava nemá platný formát nebo její divize chybí v aktuálním zdroji.');
 if(!!data.demo!==!!current().demo)throw Error('Ukázkovou sestavu lze načíst jen nad ukázkovými daty.');
 const oldMonth=$('month').value,oldDivision=$('division').value;$('month').value=data.month;$('division').value=data.division;render();
 let next=empty();try{for(const r of ['F','D','G']){if(!Array.isArray(data.selection?.[r])||data.selection[r].length!==LIMITS[r])throw Error('Sestava musí mít 3 útočníky, 2 obránce a 1 brankáře.');for(const p of data.selection[r]){const c=resolveCandidate(result[r],p);if(!c)throw Error(`Hráče ${p.name||p.id} nelze jednoznačně přiřadit k týmu v tomto zdroji a období.`);next=toggleSelection(next,c);}}}catch(error){$('month').value=oldMonth;$('division').value=oldDivision;render();throw error;}
 saved[selectionKey()]=next;if(['portrait','landscape'].includes(data.format))$('format').value=data.format;persist();render();toast('Sestava načtena a ověřena proti aktuálním datům.');
}catch(error){toast(error.message);}finally{$('load-selection').value='';}});
sources(defaultId);render();
