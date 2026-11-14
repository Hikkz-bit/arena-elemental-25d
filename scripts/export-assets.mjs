import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require('../../../estudio/motor3d/node_modules/playwright-core');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
await fs.mkdir('public/assets/glb',{recursive:true});
const manifest={version:1,author:'Arena Elemental',description:'Original stylized, articulated 3D assets. Metres, Y up, forward -Z. Cosmetic variants share gameplay stats.',characters:[],weapons:[]};
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4182/assets.html');
 for(const classId of ['mage','knight','rogue'])for(const bodyType of ['male','female']){
  const result=await page.evaluate(async({classId,bodyType})=>{
   const {createCharacter}=await import('/assets/models.js'),{animationClips}=await import('/assets/clips.js'),{GLTFExporter}=await import('/vendor/GLTFExporter.js');const a=createCharacter(classId,bodyType),clips=animationClips(a);
   const buffer=await new GLTFExporter().parseAsync(a.root,{binary:true,animations:clips,trs:true});let binary='';for(const byte of new Uint8Array(buffer))binary+=String.fromCharCode(byte);a.dispose();return {base64:btoa(binary),animations:clips.map(c=>c.name)};
  },{classId,bodyType});
  const file=classId+'-'+bodyType+'.glb',data=Buffer.from(result.base64,'base64');await fs.writeFile('public/assets/glb/'+file,data);manifest.characters.push({classId,bodyType,file,bytes:data.length,animations:result.animations});console.log(file,data.length);
 }
 for(const kind of ['sword','dagger','staff','shield']){const data=await page.evaluate(async kind=>{const {createWeapon,disposeModel}=await import('/assets/models.js'),{GLTFExporter}=await import('/vendor/GLTFExporter.js');const w=createWeapon(kind),buffer=await new GLTFExporter().parseAsync(w,{binary:true});let s='';for(const b of new Uint8Array(buffer))s+=String.fromCharCode(b);disposeModel(w);return btoa(s);},kind);const buffer=Buffer.from(data,'base64');await fs.writeFile('public/assets/glb/'+kind+'.glb',buffer);manifest.weapons.push({kind,file:kind+'.glb',bytes:buffer.length});}
 await fs.writeFile('public/assets/manifest.json',JSON.stringify(manifest,null,2)+'\n');
}finally{await browser.close();}
