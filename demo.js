import { DIVISIONS, detectMappings, importData } from './domain.js';
export function demoSnapshot() {
 const raw={Teams:[],Players:[],Games:[],Statistics:[],Goalies:[],Groups:[],Standings:[]};
 const names=['Matěj Novotný','Jan Dvořák','Adam Černý','Tomáš Svoboda','Filip Procházka','David Kučera','Ondřej Veselý','Martin Pokorný','Jakub Marek','Petr Hájek','Michal Urban','Lukáš Král'];
 DIVISIONS.forEach((group,gi)=>{ raw.Groups.push({ID:`g${gi}`,Name:group});
  for(let t=0;t<2;t++) raw.Teams.push({ID:`t${gi}-${t}`,Name:t?'Ice Wolves':'HC Meteor',Abbreviation:t?'WOL':'MET',Group:`g${gi}`});
  for(let g=0;g<4;g++) raw.Games.push({ID:`game${gi}-${g}`,Date:`2026-09-${String(5+g*7).padStart(2,'0')}`, 'Home Team':`t${gi}-0`,'Away Team':`t${gi}-1`,Status:'Finished'});
  names.forEach((name,i)=>{ const id=`p${gi}-${i}`,team=`t${gi}-${i%2}`; const pos=i<6?'Forward':i<10?'Defenseman':'Goalie';raw.Players.push({ID:id,Name:name,Team:team,Positions:pos});
   if(i<10) raw.Statistics.push({Player:id,Team:team,GP:i===5?2:4,G:Math.max(0,7-i),A:(i*3+gi)%8,PIM:i%3*2,Stars:i%3});
   else raw.Goalies.push({Player:id,Team:team,GP:4,'Shots Against':120+i*3,'Goals Against':i===10?8:12,Shutouts:i===10?1:0,Stars:1});
  });
 });
 return importData(raw,detectMappings(raw),{id:'demo',label:'Ukázková data · smyšlení hráči a výsledky',mode:'monthly',month:'2026-09',asOf:'2026-09-30',season:'2026–2027',demo:true});
}
