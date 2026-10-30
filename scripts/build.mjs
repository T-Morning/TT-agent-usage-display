import {build} from 'esbuild';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const bundle=await build({entryPoints:['public/panel.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true});
const css=await readFile('public/panel.css','utf8');
const html=(await readFile('public/panel.html','utf8')).replace('/* STYLE */',()=>css).replace('/* SCRIPT */',()=>bundle.outputFiles[0].text.replaceAll('</script','<\\/script'));
await writeFile('dist/quota.html',html);
console.log('Built dist/quota.html');
