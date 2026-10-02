import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url)),port=Number(process.env.ALL_STARS_PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'||url.pathname==='/all-stars'){res.writeHead(302,{Location:'/all-stars/'});res.end();return;}let path=decodeURIComponent(url.pathname).replace(/^\/all-stars\//,'');if(!path)path='index.html';const file=resolve(root,path);if(!file.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end('Nenalezeno');}}).listen(port,'127.0.0.1',()=>console.log(`PHM All Stars: http://localhost:${port}/all-stars/`));
