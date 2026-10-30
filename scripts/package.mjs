import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const target='dist/quota-pet';await mkdir(target,{recursive:true});
for(const path of ['src','dist/quota.html','.codex-plugin','.mcp.json','plugin.json','mcp.json']){const dest=path==='dist/quota.html'?`${target}/dist/quota.html`:`${target}/${path}`;await cp(path,dest,{recursive:true})}
const pkg=JSON.parse(await readFile('package.json','utf8'));
delete pkg.devDependencies;pkg.scripts={start:'node src/server.mjs'};
await writeFile(`${target}/package.json`,JSON.stringify(pkg,null,2));
await cp('package-lock.json',`${target}/package-lock.json`);
const result=spawnSync('npm',['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:target,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
await cp('README.md',`${target}/README.md`);
console.log(`Local plugin package: ${target}`);
