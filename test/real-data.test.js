import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {nominate,groupsOf,sheetRowsToObjects,positions} from '../domain.js';
const source=JSON.parse(await readFile(new URL('../data/2026-09.json',import.meta.url),'utf8'));
test('HMS headers may follow Source row, Czech goalie position is recognized',()=>{
 assert.deepEqual(sheetRowsToObjects('Statistics',[['Source','HMS export'],['Player Id','GP','G','A'],['p',3,2,1]])[0],{'Player Id':'p',GP:3,G:2,A:1});
 assert.deepEqual(positions('Gólman'),['G']);
});
test('approved September source resolves all 103 completed games and all five lineups',()=>{
 let count=0;
 for(const group of groupsOf(source)){
  const r=nominate(source,null,'2026-09',group);count+=r.games;
  for(const [role,minimum] of Object.entries({F:3,D:2,G:1})){
   assert.ok(r[role].filter(p=>p.eligible).length>=minimum,group+role);
   assert.ok(r[role].filter(p=>!p.manual).every(p=>p.coverage>0&&p.coverage<=1));
  }
 }
 assert.equal(count,103);assert.equal(groupsOf(source).length,5);
});
test('October counter difference excludes the playing day already awarded to September',()=>{
 const previous=structuredClone(source);previous.mode='cumulative';
 const current=structuredClone(previous);current.asOf='2026-10-31';current.month='2026-10';
 let count=0;for(const group of groupsOf(source)){const r=nominate(current,previous,'2026-10',group);assert.equal(r.ready,true);count+=r.games;assert.ok(r.F.length===0&&r.D.length===0);assert.ok(r.warnings.some(w=>w.includes('nepočítá podruhé')));}
 assert.equal(count,0);
});
