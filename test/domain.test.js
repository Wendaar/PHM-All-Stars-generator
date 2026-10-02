import test from 'node:test';
import assert from 'node:assert/strict';
import {demoSnapshot} from '../demo.js';
import {nominate,toggleSelection,monthBounds,dateOnly,positions,detectMappings,importData} from '../domain.js';
test('calendar boundaries, dates and positions',()=>{assert.deepEqual(monthBounds('2026-01'),{start:'2026-01-01',end:'2026-01-31',before:'2025-12-31'});assert.equal(monthBounds('2024-02').end,'2024-02-29');assert.equal(dateOnly('30.9.2026 20:00'),'2026-09-30');assert.deepEqual(positions('Defender / Forward'),['D','F']);assert.deepEqual(positions('Goalie'),['G']);});
test('five divisions produce isolated ranked candidates',()=>{const s=demoSnapshot();const r=nominate(s,null,'2026-09','Klasik');assert.equal(r.F.length,6);assert.equal(r.D.length,4);assert.equal(r.G.length,2);assert.equal(r.games,4);assert.equal(r.F[0].gp,4);assert.equal(r.F[0].points,r.F[0].goals+r.F[0].assists);assert.ok(r.F.every(p=>p.id.startsWith('p2-')));assert.equal(nominate(s,null,'2026-10','Klasik').ready,false);});
test('caps and unique player across positions',()=>{let selection={F:[],D:[],G:[]};for(let i=0;i<3;i++)selection=toggleSelection(selection,{id:`p${i}`,role:'F'});assert.throws(()=>toggleSelection(selection,{id:'p4',role:'F'}));assert.throws(()=>toggleSelection(selection,{id:'p1',role:'D'}));assert.equal(toggleSelection(selection,{id:'p1',role:'F'}).F.length,2);});
test('cumulative counters differ, ratios recompute; never subtract percentages',()=>{const s=demoSnapshot();s.mode='cumulative';const b=structuredClone(s);b.asOf='2026-08-31';b.data.Statistics.forEach(p=>{p.gp=0;p.goals=0;p.assists=0;p.pim=0;p.stars=0;});b.data.Goalies.forEach(p=>{p.gp=0;p.shots=0;p.ga=0;p.so=0;p.stars=0;});const r=nominate(s,b,'2026-09','Klasik');assert.equal(r.ready,true);assert.equal(r.G[0].sv,(150-8)/150);assert.equal(nominate(s,null,'2026-09','Klasik').ready,false);b.season='wrong';assert.equal(nominate(s,b,'2026-09','Klasik').ready,false);});
test('missing baseline, reset, transfer and impossible GP are flagged',()=>{const s=demoSnapshot();s.mode='cumulative';const b=structuredClone(s);b.asOf='2026-08-31';b.data.Statistics=b.data.Statistics.filter(p=>p.player!=='p2-0');b.data.Statistics.find(p=>p.player==='p2-1').gp=99;let r=nominate(s,b,'2026-09','Klasik');assert.ok(r.issues.some(i=>i.includes('Chybí předchozí')));assert.ok(r.issues.some(i=>i.includes('Záporný')));assert.ok(!r.F.some(p=>p.id==='p2-0'));s.mode='monthly';s.data.Statistics.find(p=>p.player==='p2-0').gp=99;r=nominate(s,null,'2026-09','Klasik');assert.ok(!r.F.some(p=>p.id==='p2-0'));});
test('no goalies data allows manual goalie only',()=>{const s=demoSnapshot();s.data.Goalies=[];const r=nominate(s,null,'2026-09','Super');assert.equal(r.G.length,2);assert.ok(r.G.every(p=>p.manual));});
test('unknown columns and duplicate aggregate rows fail rather than fabricate',()=>{assert.throws(()=>importData({Teams:[{ID:'t'}]},detectMappings({}),{}));const s=demoSnapshot();s.data.Statistics.push({...s.data.Statistics[0]});assert.throws(()=>nominate(s,null,'2026-09','Hobby Fire'),/více souhrnných/);});
test('one person in two teams has separate stats, coverage, selection and goalie entries',()=>{
 const s=demoSnapshot();const stat=s.data.Statistics.find(p=>p.player==='p2-0');
 const other=s.data.Teams.find(t=>t.group==='Klasik'&&t.id!==stat.team);
 s.data.Statistics.push({...stat,team:other.id,gp:2,goals:1,assists:0});
 const goalie=s.data.Goalies.find(p=>p.player.startsWith('p2-'));const otherGoalieTeam=s.data.Teams.find(t=>t.group==='Klasik'&&t.id!==goalie.team);s.data.Goalies.push({...goalie,team:otherGoalieTeam.id,gp:2});
 const r=nominate(s,null,'2026-09','Klasik');const entries=r.F.filter(p=>p.playerId==='p2-0');
 assert.equal(entries.length,2);assert.notEqual(entries[0].id,entries[1].id);
 const transferred=entries.find(p=>p.teamId===other.id);assert.equal(transferred.points,1);assert.equal(transferred.gp,2);assert.equal(transferred.coverage,2/r.teamGames[other.id]);
 let selected={F:[],D:[],G:[]};for(const p of entries)selected=toggleSelection(selected,p);assert.equal(selected.F.length,2);
 assert.equal(r.G.filter(p=>p.playerId===goalie.player).length,2);
});
test('missing or unrecognized skater position appears in both lists without score penalty',()=>{
 for(const position of ['', 'neznámá']){
  const s=demoSnapshot(),player=s.data.Players.find(p=>p.id==='p2-0');player.position=position;
  const r=nominate(s,null,'2026-09','Klasik'),f=r.F.find(p=>p.playerId===player.id),d=r.D.find(p=>p.playerId===player.id);
  assert.ok(f&&d&&f.positionUnverified&&d.positionUnverified);assert.equal(f.score,d.score);assert.equal(f.id,d.id);
  assert.throws(()=>toggleSelection(toggleSelection({F:[],D:[],G:[]},f),d),/jiné pozici/);
  assert.ok(!r.G.some(p=>p.playerId===player.id));
 }
});
