// Pure data rules shared by the browser and node:test. No game-detail scraping.
export const DIVISIONS = ['Hobby Fire', 'Hobby Ice', 'Klasik', 'Sport', 'Super'];
export const LIMITS = { F: 3, D: 2, G: 1 };
export const SCHEMA = {
 Teams: { id: ['ID','Team ID','TeamId'], name: ['Name','Team','Team Name'], nick:['Nick'], abbr: ['Abbreviation','Short','Short Name','Code'], group: ['Group','Group ID','Division'], logo: ['Logo (Medium)','Logo'] },
 Players: { id: ['ID','Player ID','PlayerId'], name: ['Name','Player','Player Name','Full Name'], first: ['First Name','FirstName'], last: ['Last Name','LastName'], team: ['Team','Teams','Team ID','TeamId'], position: ['Positions','Position'], photo: ['Logo (Medium)','Photo'] },
 Games: { id: ['ID','Game ID','GameId'], date: ['Date','Start','Start Date','Date Time'], home: ['Home Team','HomeTeam','Home Team ID'], away: ['Away Team','AwayTeam','Away Team ID'], group: ['Group','Group ID','Division'], status: ['Status','State'], season:['Season'], phase:['Phase'] },
 Statistics: { player: ['Player ID','PlayerId','Player'], team: ['Team ID','TeamId','Team'], group: ['Group','Group ID','Division'], game: ['Game','Game ID'], date: ['Date'], gp: ['GP','Games','Games Played','Matches'], goals: ['G','Goals'], assists: ['A','Assists'], points: ['P','PTS','Points'], pim: ['PIM','Penalty Minutes'], stars: ['Stars','MVP','Game Stars','Star of the Game'], season:['Season'], phase:['Phase'], first:['FirstName','First Name'],last:['LastName','Last Name'],photo:['Player Logo (Medium)'],logo:['Team Logo (Medium)'],abbr:['TeamShort'] },
 Goalies: { player: ['Player ID','PlayerId','Player'], team: ['Team ID','Team'], group: ['Group','Group ID','Division'], game: ['Game','Game ID'], date: ['Date'], gp: ['GP','Games','Games Played'], saves: ['Saves','Svs','SV'], shots: ['Shots Against','SA'], ga: ['Goals Against','GA'], so: ['Shutouts','SO'], stars: ['Stars','MVP','Game Stars'], sv: ['Save Percentage','SvP','SV%','Save %'],season:['Season'],phase:['Phase'],first:['FirstName','First Name'],last:['LastName','Last Name'],photo:['Player Logo (Medium)'],logo:['Team Logo (Medium)'],abbr:['TeamShort'] },
 Groups: { id: ['ID','Group ID'], name: ['Name','Group','Division'], logo: ['Logo (Medium)','Logo'] },
 Standings: { team: ['Team','Team ID'], group: ['Group','Division'], gp: ['GP','Games'], ga: ['GA','Goals Against'] }
};
const key = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const number = v => { if(v === '' || v == null) return null; const n = Number(String(v).replace(/\s/g,'').replace(',','.').replace('%','')); return Number.isFinite(n) ? n : null; };
export function dateOnly(v) {
 if(v instanceof Date) return v.toISOString().slice(0,10);
 if(typeof v === 'number') return new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);
 const s=String(v??'').trim(); let m=s.match(/(\d{4})-(\d{2})-(\d{2})/); if(m) return `${m[1]}-${m[2]}-${m[3]}`;
 m=s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';
}
export function monthBounds(month) { const [y,m]=month.split('-').map(Number); return { start: `${month}-01`, end: new Date(Date.UTC(y,m,0)).toISOString().slice(0,10), before: new Date(Date.UTC(y,m-1,0)).toISOString().slice(0,10) }; }
export function detectMappings(raw) { const out={}; for(const [sheet,fields] of Object.entries(SCHEMA)) { const headers=Object.keys(raw[sheet]?.[0]??{}); out[sheet]={}; for(const [field,aliases] of Object.entries(fields)) out[sheet][field]=aliases.map(a=>headers.find(h=>key(a)===key(h))).find(Boolean)??''; } return out; }
export function sheetRowsToObjects(sheet,rows) {
 const aliases=Object.values(SCHEMA[sheet]||{}).flat().map(key);
 const scored=rows.slice(0,12).map((r,i)=>({i,score:r.filter(v=>aliases.includes(key(v))).length})).sort((a,b)=>b.score-a.score);
 const index=scored[0]?.i??0,headers=rows[index]||[];
 return rows.slice(index+1).filter(r=>r.some(v=>v!==''&&v!=null)).map(r=>Object.fromEntries(headers.map((h,i)=>[String(h||`Column ${i+1}`),r[i]??''])));
}
export function divisionName(value) { return DIVISIONS.find(g=>key(g)===key(value))||String(value??'').trim(); }
function normalize(raw,map) { return Object.fromEntries(Object.entries(SCHEMA).map(([sheet,fields])=>[sheet,(raw[sheet]??[]).map(row=>Object.fromEntries(Object.keys(fields).map(f=>[f,row[map[sheet]?.[f]]??''])))])); }
export function importData(raw,map,meta) {
 for(const sheet of ['Teams','Players','Games','Statistics']) if(!raw[sheet]?.length) throw Error(`Chybí list ${sheet} nebo je prázdný.`);
 const data=normalize(raw,map);
 for(const [sheet,fields] of Object.entries({Teams:['id','name'],Players:['id','team','position'],Games:['date','home','away'],Statistics:['player','gp','goals','assists']})) for(const field of fields) if(!map[sheet]?.[field]) throw Error(`Vyberte sloupec ${sheet} → ${field}.`);
 data.Groups=data.Groups.filter(g=>g.name).map(g=>({...g,name:divisionName(g.name),id:g.id||key(g.name)}));
 const groupName=v=>divisionName(ref(data.Groups,v)?.name||v);
 for(const sheet of ['Games','Statistics','Goalies']) data[sheet].forEach(row=>{row.group=groupName(row.group);});
 for(const team of data.Teams) {
  const groups=new Set();if(team.group)groups.add(groupName(team.group));
  for(const s of [...data.Statistics,...data.Goalies])if(s.group&&String(ref(data.Teams,s.team)?.id)===String(team.id))groups.add(s.group);
  for(const game of data.Games)if(game.group&&[game.home,game.away].some(v=>String(ref(data.Teams,v)?.id)===String(team.id)))groups.add(game.group);
  team.groups=[...groups];team.group=team.groups.length===1?team.groups[0]:groupName(team.group);
 }
 if(!data.Teams.some(t=>t.groups.length)) throw Error('Divize nejsou v Teams ani v Games/Statistics. Vyberte sloupec group.');
 // Fill only names and media from the same player's stat row, never infer their position.
 for(const stat of [...data.Statistics,...data.Goalies]) {const p=ref(data.Players,stat.player),t=ref(data.Teams,stat.team);if(p){p.name=p.name||`${stat.first} ${stat.last}`.trim();p.photo=p.photo||stat.photo;}if(t){t.logo=t.logo||stat.logo;t.abbr=t.abbr||stat.abbr;}}
 const knownDates=data.Games.map(g=>dateOnly(g.date)); if(knownDates.some(d=>!d)) throw Error('Některá data zápasů nelze přečíst. Použijte YYYY-MM-DD nebo DD.MM.YYYY.');
 for(const s of ['Teams','Players','Groups']) { const seen=new Set(); for(const row of data[s]) { const id=String(row.id).trim(); if(!id || seen.has(id)) throw Error(`${s}: chybějící nebo duplicitní ID ${id}.`); seen.add(id); } }
 if(data.Goalies.length) for(const f of ['player','gp']) if(!map.Goalies?.[f]) throw Error(`Vyberte sloupec Goalies → ${f}.`);
 return { ...meta, data, importedAt: new Date().toISOString() };
}
const indexes=new WeakMap();
function ref(rows,value) { const v=String(value??'').trim();if(!v)return null;let idx=indexes.get(rows);if(!idx||idx.size!==rows.length){idx={size:rows.length,ids:new Map(),names:new Map()};for(const row of rows){idx.ids.set(String(row.id).trim(),row);for(const alias of [row.name,row.nick,row.abbr]){const k=key(alias);if(!k)continue;idx.names.set(k,idx.names.has(k)&&idx.names.get(k)!==row?null:row);}}indexes.set(rows,idx);}return idx.ids.get(v)||idx.names.get(key(v))||null; }
export function groupsOf(snapshot) { const d=snapshot.data; return [...new Set(d.Teams.flatMap(t=>t.groups?.length?t.groups:[divisionName(ref(d.Groups,t.group)?.name||t.group)]).filter(Boolean))].filter(g=>DIVISIONS.includes(g)).sort((a,b)=>DIVISIONS.indexOf(a)-DIVISIONS.indexOf(b)); }
export function positions(v) { const s=String(v).toLowerCase(); const roles=[]; if(/goal|g[oó]lman|brank|(^|[\s,;/|])g($|[\s,;/|])/.test(s)) roles.push('G'); if(/defen|obr[aá]n|(^|[\s,;/|])d($|[\s,;/|])/.test(s)) roles.push('D'); if(/forward|attack|[uú]to[cč]|center|centre|wing|(^|[\s,;/|])(f|c|lw|rw|l|r)($|[\s,;/|])/.test(s)) roles.push('F'); return roles; }
const COUNTERS = { Statistics:['gp','goals','assists','pim','stars'], Goalies:['gp','saves','shots','ga','so','stars'] };
export function nominate(current,previous,month,division) {
 const d=current.data, bounds=monthBounds(month), warnings=[], issues=[];
 const teamGroup=t=>divisionName(ref(d.Groups,t.group)?.name||t.group);
 const teams=d.Teams.filter(t=>t.groups?.includes(division)||teamGroup(t)===division); const teamIds=new Set(teams.map(t=>String(t.id)));
 const exception=current.periodException?.approved&&current.month===month&&current.mode==='monthly'?current.periodException:null;
 const carriedBaseline=current.mode==='cumulative'&&previous?.periodException?.approved&&previous.periodException.creditedMonth===new Date(`${bounds.before}T12:00:00Z`).toISOString().slice(0,7)&&previous.asOf>bounds.before&&previous.asOf<bounds.end;
 const gameStart=carriedBaseline?previous.asOf:bounds.start,gameEnd=exception?exception.through:bounds.end;
 const games=d.Games.filter(g=>{const date=dateOnly(g.date); const status=key(g.status);return (carriedBaseline?date>gameStart:date>=gameStart)&&date<=gameEnd&&(!g.group||divisionName(g.group)===division)&&(!g.season||key(g.season)===key(current.season))&&!['scheduled','cancelled','postponed','planned','notplayed','notstarted','naplanovano','zruseno'].includes(status);});
 const teamGames=new Map(teams.map(t=>[String(t.id),games.filter(g=>String(ref(d.Teams,g.home)?.id)===String(t.id)||String(ref(d.Teams,g.away)?.id)===String(t.id)).length]));
 if(d.Games.some(g=>!g.status)) warnings.push('Zápasy bez stavu se počítají jako odehrané. Zkontrolujte počet zápasů týmu.');
 let ready=true;
 if(current.mode==='monthly' && current.month!==month) {ready=false; warnings.push('Tento export je potvrzený pro jiný měsíc.');}
 if(current.mode==='cumulative') {
  if(current.asOf!==bounds.end || !previous || (previous.asOf!==bounds.before&&!carriedBaseline) || previous.mode!=='cumulative'||key(previous.season)!==key(current.season)) {ready=false; warnings.push(`Potřebujete kumulativní uzávěrky stejné sezony k ${bounds.before} a ${bounds.end}.`);}
 }
 const result={F:[],D:[],G:[],warnings,issues,ready,teamGames:Object.fromEntries(teamGames),games:games.filter(g=>teamIds.has(String(ref(d.Teams,g.home)?.id))||teamIds.has(String(ref(d.Teams,g.away)?.id))).length};
 if(!ready) return result;
 if(exception) warnings.push(exception.note);
 if(carriedBaseline) warnings.push(`Říjnový hrací den zahrnutý do zářijového ocenění se nepočítá podruhé. Tento přírůstek začíná po ${previous.asOf}.`);
 if(!d.Goalies.length) warnings.push('Goalies zatím chybí. Brankáře vyberte ručně z Players; bez statistického pořadí.');
 function aggregates(snapshot,sheet) {
  const m=new Map(); for(const row of snapshot.data[sheet]) {
   if(row.season&&key(row.season)!==key(snapshot.season))continue;
   const player=ref(snapshot.data.Players,row.player); if(!player) {issues.push(`${sheet}: neznámý hráč ${row.player}.`);continue;}
   const team=ref(snapshot.data.Teams,row.team||player.team); if(!team) {issues.push(`${sheet}: neznámý tým hráče ${player.name}.`);continue;}
   const resolvedGroup=ref(snapshot.data.Groups,row.group||team.group); const group=divisionName(resolvedGroup?.name||row.group||team.group);
   const id=`${player.id}|${team.id}|${key(group)}`;
   const count=COUNTERS[sheet]; const values=Object.fromEntries(count.map(c=>[c,number(row[c])]));
   if(m.has(id)) throw Error(`${sheet}: více souhrnných řádků pro hráče ${player.name||player.id}, tým a divizi. Sloučte řádky nebo upřesněte zdroj; MVP nepřičítá nejasné součty.`);
   m.set(id,{...values,player,team,group,sv:number(row.sv)});
  } return m;
 }
 const rank=(s,role)=> { const coverage=s.gp/(teamGames.get(String(s.team.id))||Infinity); const ppg=(s.goals+s.assists)/s.gp; return role==='G' ? 100*(s.sv??0)+8*coverage+2*(s.so??0)+Math.min(s.stars??0,3)-2*(s.ga!=null?s.ga/s.gp:0) : 6*ppg+3*coverage+Math.min(s.stars??0,3)*.6-(s.pim??0)*.03; };
 for(const sheet of ['Statistics','Goalies']) {
  const rows=aggregates(current,sheet), base=previous&&current.mode==='cumulative'?aggregates(previous,sheet):new Map();
  for(const [id,row] of rows) {
   if(row.group!==division || !teamIds.has(String(row.team.id))) continue;
   const s={...row}; let invalid=false;
   if(current.mode==='cumulative') {
    const b=base.get(id);
    // Missing baseline is ambiguous (transfer, omitted row, new player), never assume zero.
    if(!b) {issues.push(`Chybí předchozí řádek: ${row.player.name||row.player.id}. Vyřazeno z pořadí.`);continue;}
    for(const c of COUNTERS[sheet]) {s[c]=row[c]!=null&&b[c]!=null?row[c]-b[c]:null; if(s[c]<0) invalid=true;}
    s.sv=null;
   }
   if(invalid || COUNTERS[sheet].some(c=>s[c]!=null&&s[c]<0)) {issues.push(`Záporný přírůstek nebo čítač: ${row.player.name||row.player.id}. Zkontrolujte sezonu nebo opravu dat.`);continue;}
   if(!s.gp || s.gp<0) continue;
   if(sheet==='Statistics' && (s.goals==null||s.assists==null)) {issues.push(`Chybí góly/asistence: ${s.player.name}.`);continue;}
   if(sheet==='Goalies') {
    if(s.shots!=null&&s.ga!=null) s.saves=s.shots-s.ga;
    if(s.shots==null&&s.saves!=null&&s.ga!=null) s.shots=s.saves+s.ga;
    if(s.shots>0&&s.saves!=null) s.sv=s.saves/s.shots;
    else if(current.mode==='monthly'&&s.sv!=null) s.sv=s.sv>1?s.sv/100:s.sv;
    if(s.sv==null || s.ga==null || s.sv<0 || s.sv>1) {issues.push(`Chybí použitelná úspěšnost nebo GA: ${s.player.name}. Brankář bez pořadí.`);continue;}
   }
   const count=teamGames.get(String(s.team.id))||0, coverage=count?s.gp/count:null;
   if(!count || s.gp>count) {issues.push(`Nesouhlasí GP a zápasy týmu: ${s.player.name||s.player.id} (${s.gp}/${count}). Vyřazeno.`);continue;}
   const roles=sheet==='Goalies'?['G']:positions(s.player.position).filter(r=>r!=='G');
   if(!roles.length) issues.push(`Neznámá pozice: ${s.player.name||s.player.id}.`);
   for(const role of roles) {
    const candidate={id:String(s.player.id),name:s.player.name||`${s.player.first} ${s.player.last}`.trim()||String(s.player.id),team:s.team.name,abbr:s.team.abbr||s.team.name,photo:String(s.player.photo||''),logo:String(s.team.logo||''),role,gp:s.gp,goals:s.goals,assists:s.assists,points:sheet==='Statistics'?s.goals+s.assists:null,pim:s.pim,stars:s.stars,sv:s.sv,ga:s.ga,so:s.so,coverage,score:rank(s,role),eligible:coverage>.5,manual:false};
    result[role].push(candidate);
   }
  }
 }
 // Goalies always available for manual selection when counters aren't usable.
 for(const p of d.Players) {const team=ref(d.Teams,p.team); if(!team||!teamIds.has(String(team.id))||!positions(p.position).includes('G')||result.G.some(g=>g.id===String(p.id))) continue; result.G.push({id:String(p.id),name:p.name||`${p.first} ${p.last}`.trim(),team:team.name,abbr:team.abbr||team.name,photo:String(p.photo||''),logo:String(team.logo||''),role:'G',manual:true,eligible:false,score:-Infinity});}
 for(const role of ['F','D','G']) {
  const counts=new Map();for(const p of result[role])counts.set(p.id,(counts.get(p.id)||0)+1);
  const ambiguous=result[role].filter(p=>counts.get(p.id)>1);
  for(const p of ambiguous) issues.push(`Více týmů ve stejné divizi: ${p.name}. MVP hráče vyřazuje, dokud není souhrn jednoznačný.`);
  result[role]=result[role].filter(p=>counts.get(p.id)===1).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score||a.name.localeCompare(b.name,'cs'));
 }
 warnings.push('Pozice jsou preferované z Players; skutečné posty v zápasech nejsou ověřené. Obránci mají stejné bodové hodnocení jako útočníci, protože chybí obranné metriky.');
 result.issues=[...new Set(issues)]; return result;
}
export function toggleSelection(selection,candidate) {
 const next={F:[...selection.F],D:[...selection.D],G:[...selection.G]}; const role=candidate.role;
 if(next[role].includes(candidate.id)) {next[role]=next[role].filter(id=>id!==candidate.id);return next;}
 if(Object.values(next).some(ids=>ids.includes(candidate.id))) throw Error('Hráč už je vybraný na jiné pozici.');
 if(next[role].length>=LIMITS[role]) throw Error(`Na této pozici už je vybráno ${LIMITS[role]} hráčů. Nejprve jednoho odznačte.`);
 next[role].push(candidate.id); return next;
}
