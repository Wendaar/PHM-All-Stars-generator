import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {SCHEMA,detectMappings,importData,nominate} from '../domain.js';
import {demoSnapshot} from '../demo.js';
test('real XLSX binary roundtrip imports all seven sheets',async()=>{
 const context={};runInNewContext(await readFile(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),context);const XLSX=context.XLSX;
 const demo=demoSnapshot(),wb=XLSX.utils.book_new();
 for(const [sheet,rows] of Object.entries(demo.data)){const raw=rows.map(row=>Object.fromEntries(Object.entries(row).filter(([field])=>SCHEMA[sheet][field]).map(([field,value])=>[SCHEMA[sheet][field][0],value])));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(raw),sheet);}
 const binary=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});await writeFile(new URL('./Ukazkovy-HMS.xlsx',import.meta.url),binary);
 const parsed=XLSX.read(binary,{type:'buffer',cellDates:true});const raw={};for(const sheet of parsed.SheetNames)raw[sheet]=XLSX.utils.sheet_to_json(parsed.Sheets[sheet],{defval:''});
 const imported=importData(raw,detectMappings(raw),{...demo,data:undefined});const ranked=nominate(imported,null,'2026-09','Hobby Ice');assert.equal(ranked.F.length,6);assert.equal(ranked.G.length,2);assert.equal(ranked.games,4);
});
