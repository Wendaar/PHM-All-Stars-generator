export const escapeHTML = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeImage = value => {try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
export const initials = name => String(name||'?').split(/\s+/).slice(0,2).map(n=>n[0]).join('');
export const monthLabel = month => new Date(`${month}-15T12:00:00Z`).toLocaleDateString('cs-CZ',{month:'long',year:'numeric',timeZone:'UTC'});
const roles={F:'ÚTOČNÍK',D:'OBRÁNCE',G:'BRANKÁŘ'};
export function graphicHTML(selection,month,division,format,{demo=false,groupLogo='',background=''}={}) {
 const bg=background||new URL(`./assets/${format}.png`,import.meta.url).href;
 const card=(p,role)=>`<div class="player-card"><div class="portrait-wrap">${p&&safeImage(p.photo)?`<img src="${escapeHTML(safeImage(p.photo))}" alt="${escapeHTML(p.name)}">`:escapeHTML(p?initials(p.name):'＋')}</div><div class="player-name">${escapeHTML(p?.name||'Vyberte hráče')}</div><div class="player-team">${p&&safeImage(p.logo)?`<img src="${escapeHTML(safeImage(p.logo))}" alt="">`:''}${escapeHTML(p?.abbr||'—')}</div><div class="player-role">${roles[role]}</div></div>`;
 return `<div class="graphic ${format}" style="background-image:url('${escapeHTML(bg)}')"><div class="graphic-top"><span>PHM / HALL OF FAME</span><span>${demo?'DEMO':'ALL STARS'}</span></div><div class="graphic-title">ALL STARS</div><div class="graphic-subtitle">${safeImage(groupLogo)?`<img src="${escapeHTML(safeImage(groupLogo))}" alt="">`:''}${escapeHTML(division)} · ${escapeHTML(monthLabel(month))}</div>${['F','D','G'].map(r=>`<div class="lineup-row">${Array.from({length:{F:3,D:2,G:1}[r]},(_,i)=>card(selection[r][i],r)).join('')}</div>`).join('')}<div class="graphic-footer"><span>${demo?'UKÁZKOVÁ SESTAVA · SMYŠLENÁ DATA':'HVĚZDY MĚSÍCE'}</span><span>HMS INSIGHTS</span></div></div>`;
}
export async function imageData(url) { const response=await fetch(url); if(!response.ok) throw Error('Pozadí nelze načíst.'); const blob=await response.blob();return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);}); }
export async function exportDocument(selection,month,division,format,options={}) {
 const css=await (await fetch(new URL('./styles.css',import.meta.url))).text();
 const background=await imageData(new URL(`./assets/${format}.png`,import.meta.url));
 // Keep remote photo URLs in HTML; PNG uses a safe CORS fallback separately.
 const html=graphicHTML(selection,month,division,format,{...options,background});
 const parameters=JSON.stringify({schema:1,month,division,format,selection,demo:!!options.demo,asOf:options.asOf||null,periodException:options.periodException||null}).replace(/</g,'\\u003c');
 return `<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PHM All Stars · ${escapeHTML(division)} · ${escapeHTML(monthLabel(month))}</title><style>${css}\nbody{margin:0;background:#070a0f}.graphic{width:100%;border-radius:0}.graphic.portrait{max-width:1080px}</style>${html}<script type="application/json" id="all-stars-parameters">${parameters}</script></html>`;
}
let mediaMap;
async function cachedMedia(){if(!mediaMap)mediaMap=fetch(new URL('./assets/media-map.json',import.meta.url)).then(r=>r.ok?r.json():{}).catch(()=>({}));return mediaMap;}
function loadImage(url) { return new Promise(resolve=> {if(!url){resolve(null);return;} const img=new Image();img.crossOrigin='anonymous';let timer=setTimeout(()=>resolve(null),7000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);resolve(null);};img.src=url;}); }
export async function exportPNG(selection,month,division,format,options={}) {
 const portrait=format==='portrait',w=portrait?1080:1600,h=portrait?1920:1000;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),missing=[];
 const players=Object.values(selection).flat();const urls=[new URL(`./assets/${format}.png`,import.meta.url).href,safeImage(options.groupLogo),...players.flatMap(p=>[safeImage(p.photo),safeImage(p.logo)])];
 const cache=await cachedMedia();const images=await Promise.all(urls.map(url=>loadImage(cache[url]?new URL(cache[url],import.meta.url).href:url)));const bg=images[0];ctx.fillStyle='#0a1420';ctx.fillRect(0,0,w,h);
 if(bg) {const scale=Math.max(w/bg.width,h/bg.height);ctx.drawImage(bg,(w-bg.width*scale)/2,(h-bg.height*scale)/2,bg.width*scale,bg.height*scale);} else missing.push('PHM pozadí');
 const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#05101b77');gradient.addColorStop(1,'#08121df2');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 const text=(s,x,y,size,color='#fff',align='left',weight=800,max=w)=>{ctx.textAlign=align;ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillText(s,x,y,max);};
 text('PHM / HALL OF FAME',w*.07,h*.085,portrait?27:24,'#dfff3f');text(options.demo?'DEMO':'ALL STARS',w*.93,h*.085,portrait?27:24,'#dfff3f','right');text('ALL STARS',w*.07,h*.18,portrait?112:106);
 if(images[1]) ctx.drawImage(images[1],w*.07,h*.204,45,45);
 text(`${division} · ${monthLabel(month)}`,images[1]?w*.07+60:w*.07,h*.23,portrait?34:31,'#c6eaf5','left',600,w*.86);
 let imageIndex=2;
 ['F','D','G'].forEach((role,ri)=>{
  const row=selection[role],count={F:3,D:2,G:1}[role],gap=portrait?w*.295:w*.25,y=portrait?h*(.39+ri*.21):h*(.35+ri*.205),radius=portrait?94:67;
  for(let i=0;i<count;i++) {const p=row[i],x=w/2+(i-(count-1)/2)*gap;let photo=null,logo=null;if(p){photo=images[imageIndex++];logo=images[imageIndex++];if(p.photo&&!photo)missing.push(p.name);if(p.logo&&!logo)missing.push(`logo ${p.abbr}`);}
   ctx.save();ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.clip();ctx.fillStyle='#142c3f';ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
   if(photo){const scale=Math.max(radius*2/photo.width,radius*2/photo.height);ctx.drawImage(photo,x-photo.width*scale/2,y-photo.height*scale/2,photo.width*scale,photo.height*scale);}else text(p?initials(p.name):'＋',x,y+14,portrait?50:39,'#91e8ff','center');ctx.restore();ctx.strokeStyle='#91e8ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.stroke();
   if(portrait){const words=(p?.name||'Vyberte hráče').split(' ');text(words.shift(),x,y+radius+42,32,'#fff','center',800,gap*.93);text(words.join(' '),x,y+radius+79,32,'#fff','center',800,gap*.93);}else text(p?.name||'Vyberte hráče',x,y+radius+34,27,'#fff','center',800,gap*.93);
   const ty=y+radius+(portrait?119:64);if(logo)ctx.drawImage(logo,x-72,ty-23,30,30);text(p?.abbr||'—',x+(logo?12:0),ty,portrait?25:22,'#b7c9d8','center',600,gap*.7);text(roles[role],x,ty+(portrait?39:30),portrait?23:18,'#dfff3f','center',700);
  }
 });
 ctx.strokeStyle='#ffffff33';ctx.beginPath();ctx.moveTo(w*.07,h*.944);ctx.lineTo(w*.93,h*.944);ctx.stroke();text(options.demo?'UKÁZKOVÁ SESTAVA · SMYŠLENÁ DATA':'HVĚZDY MĚSÍCE',w*.07,h*.975,portrait?20:18,'#a4b8c9');text('HMS INSIGHTS',w*.93,h*.975,portrait?20:18,'#a4b8c9','right');
 return {blob:await new Promise(resolve=>canvas.toBlob(resolve,'image/png')),missing:[...new Set(missing)]};
}
