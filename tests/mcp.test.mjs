import test from 'node:test';import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
test('official SDK discovers thread entrypoint and self-contained resource',async()=>{
const client=new Client({name:'quota-test',version:'1.0.0'});const transport=new StdioClientTransport({command:process.execPath,args:['src/server.mjs'],stderr:'ignore'});
try{await client.connect(transport);const {tools}=await client.listTools();const tool=tools.find(t=>t.name==='show_quota_pet');assert.equal(tool._meta['openai/ui'].entrypoints[0].type,'thread');const resource=await client.readResource({uri:tool._meta.ui.resourceUri});assert.match(resource.contents[0].text,/额度伙伴/);assert.match(resource.contents[0].mimeType,/mcp-app/);assert.ok(!resource.contents[0].text.includes('/* SCRIPT */'))}finally{await client.close()}
});
