import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWeapon,disposeModel} from '../public/assets/models.js';
import {ACTIONS,CLIP_NAMES,LOWER_BONES,attackOf,pickLayers,legTwist} from '../public/assets/anim-state.js';

// Animation rules.
const alive={hp:100,y:0,moving:false,parry:0,parryFlash:0,burst:null};
assert.deepEqual(pickLayers(alive,null),{upper:'Idle',lower:'Idle'});
assert.deepEqual(pickLayers({...alive,moving:true},null),{upper:'Run',lower:'Run'});
assert.deepEqual(pickLayers({...alive,moving:true},'knight0'),{upper:'knight0',lower:'Run'},'legs keep running under a slash');
assert.deepEqual(pickLayers(alive,'knight0'),{upper:'knight0',lower:'knight0'},'standing attack uses the whole body');
assert.deepEqual(pickLayers({...alive,moving:true},'knight2'),{upper:'knight2',lower:'knight2'},'ground slam always uses the whole body');
assert.deepEqual(pickLayers({...alive,moving:true,parry:.2},null),{upper:'Parry',lower:'Run'});
assert.deepEqual(pickLayers({...alive,parryFlash:.2},null),{upper:'Parry',lower:'Idle'});
assert.deepEqual(pickLayers({...alive,y:.6,moving:true},null),{upper:'Jump',lower:'Jump'});
assert.deepEqual(pickLayers({...alive,y:.6},'mage0'),{upper:'mage0',lower:'Jump'},'casting in the air keeps the jump legs');
assert.deepEqual(pickLayers({...alive,burst:{kind:'dodge'}},'mage0'),{upper:'Roll',lower:'Roll'},'the dash overrides an attack');
assert.deepEqual(pickLayers({...alive,burst:{kind:'dash'}},null),{upper:'Dash',lower:'Dash'});
assert.deepEqual(pickLayers({...alive,burst:{kind:'charge'}},'knight1'),{upper:'knight1',lower:'knight1'});
assert.deepEqual(pickLayers({...alive,hp:0,burst:{kind:'dodge'},parry:1},'knight0'),{upper:'Death',lower:'Death'},'death wins over everything');
for(const classId of ['knight','mage','rogue'])for(let i=0;i<3;i++){const id=attackOf(classId,i);if(classId==='rogue'&&i===1)assert.equal(id,null);else assert(ACTIONS[id].once&&ACTIONS[id].time>0,id);}
assert.equal(attackOf('mage',7),null);assert.equal(attackOf('toString',''),null);
for(const a of Object.values(ACTIONS)){assert(CLIP_NAMES.includes(a.clip));if(a.from!==undefined)assert(a.to>a.from);}
assert.deepEqual(legTwist(0,0),{angle:0,backwards:false});assert.deepEqual(legTwist(1,0),{angle:0,backwards:false});
assert(legTwist(0,1).angle>1&&!legTwist(0,1).backwards,'strafing right turns the legs right');assert(legTwist(0,-1).angle<-1);
assert(legTwist(-1,0).backwards&&Math.abs(legTwist(-1,0).angle)<1e-9,'straight back runs backwards without twist');
assert(legTwist(-1,1).backwards&&legTwist(-1,1).angle<0,'back-right pedals backwards with the legs turned left');

// Shipped character files: skinned, 24 joints, every clip present and well formed.
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));assert.equal(manifest.characters.length,6);
for(const classId of ['mage','knight','rogue'])for(const bodyType of ['male','female']){
 const name=classId+'-'+bodyType,file=fs.readFileSync('public/assets/glb/'+name+'.glb');assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(8),file.length);assert(file.length<2.5e6,name+' stays under 2.5 MB');
 const n=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+n).toString()),bin=file.subarray(28+n),skin=gltf.skins[0],prim=gltf.meshes[0].primitives[0];
 assert.equal(skin.joints.length,24);for(const bone of LOWER_BONES.concat(['Spine02','Spine','Head','LeftHand','RightHand','LeftForeArm']))assert(skin.joints.some(j=>gltf.nodes[j].name===bone),name+' has bone '+bone);
 for(const key of ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'])assert(prim.attributes[key]!==undefined,name+' '+key);
 const triangles=gltf.accessors[prim.indices].count/3;assert(triangles>15000&&triangles<35000,name+' triangle budget');
 const position=gltf.accessors[prim.attributes.POSITION];assert(Math.abs(position.max[1]-position.min[1]-1.75)<.02,name+' is 1.75 m tall');assert(position.max[0]-position.min[0]>position.max[2]-position.min[2],name+' faces +Z with arms along X');
 assert.deepEqual(gltf.animations.map(a=>a.name),CLIP_NAMES);
 const hips=skin.joints.find(j=>gltf.nodes[j].name==='Hips');
 for(const clip of gltf.animations){
  assert(clip.channels.length>=20,name+' '+clip.name+' animates the body');assert.equal(clip.channels.filter(c=>c.target.path==='translation').length,1);
  for(const c of clip.channels){assert(skin.joints.includes(c.target.node));const s=clip.samplers[c.sampler],out=gltf.accessors[s.output],view=gltf.bufferViews[out.bufferView],data=new Float32Array(bin.buffer.slice(bin.byteOffset+view.byteOffset,bin.byteOffset+view.byteOffset+view.byteLength));assert(data.every(Number.isFinite),name+' '+clip.name+' finite');
   if(c.target.path==='rotation')for(let i=0;i<data.length;i+=4)assert(Math.abs(Math.hypot(data[i],data[i+1],data[i+2],data[i+3])-1)<1e-3,'unit quaternion');
   else{assert.equal(c.target.node,hips);if(clip.name==='Run'||clip.name==='Idle'||clip.name==='Roll'){for(let i=3;i<data.length;i+=3){assert.equal(data[i],data[0],clip.name+' does not travel in X');assert.equal(data[i+2],data[2],clip.name+' does not travel in Z');}}}
  }
 }
 assert.equal(manifest.characters.find(c=>c.classId===classId&&c.bodyType===bodyType).bytes,file.length);
}
for(const kind of ['sword','dagger','staff','shield']){const w=createWeapon(kind);assert(w.children.length>2);disposeModel(w);}
console.log('PASS: animation layers and leg twist rules, six skinned characters with 24 joints and 12 clips each, in-place locomotion, unit rotations, four weapons');
