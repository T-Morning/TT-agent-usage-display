import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {registerAppTool,registerAppResource,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {createQuotaReader} from './quota.mjs';
const htmlPath=new URL('../dist/quota.html',import.meta.url);
const uri='ui://quota-pet/panel.html';
const read=createQuotaReader();
const reply=async()=>{const data=await read();return {structuredContent:data,content:[{type:'text',text:data.error??'5h 与每周剩余额度已更新'}]}};
if(process.argv.includes('--preview')) {
  const port=Number(process.env.PORT||4318);
  const server=createServer(async(req,res)=>{
    const host=req.headers.host;
    if(host!==`127.0.0.1:${port}` && host!==`localhost:${port}`){res.writeHead(403).end();return}
    const origin=req.headers.origin;
    if(origin && origin!==`http://${host}`){res.writeHead(403).end();return}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    if(req.method!=='GET'){res.writeHead(405).end();return}
    if(req.url==='/api/quota'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await read()));return}
    if(req.url==='/' || req.url==='/favicon.ico'){
      if(req.url.endsWith('.ico')){res.writeHead(204).end();return}
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(htmlPath));return
    }
    res.writeHead(404).end();
  });
  server.listen(port,'127.0.0.1',()=>console.error(`预览 http://127.0.0.1:${port}`));
} else {
  const server=new McpServer({name:'quota-pet',version:'0.1.0'});
  registerAppResource(server,'quota-pet-panel',uri,{},async()=>({contents:[{uri,mimeType:RESOURCE_MIME_TYPE,text:await readFile(htmlPath,'utf8'),_meta:{ui:{csp:{connectDomains:[],resourceDomains:[]}}}}]}));
  registerAppTool(server,'show_quota_pet',{title:'额度伙伴',description:'在会话侧面板中查看 Codex 5h 和每周剩余额度，设置圆环颜色与宠物显示。',inputSchema:{},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:{ui:{resourceUri:uri},'openai/ui':{entrypoints:[{type:'thread'}]}}},reply);
  registerAppTool(server,'refresh_quota',{title:'刷新额度',description:'只读刷新当前账户额度，不消耗额度重置次数。',inputSchema:{},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:{ui:{visibility:['app']}}},reply);
  await server.connect(new StdioServerTransport());
}
