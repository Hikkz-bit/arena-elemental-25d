import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCharacter,animateCharacter,createWeapon,disposeModel} from '../public/assets/models.js';
import {animationClips} from '../public/assets/clips.js';
for(const classId of ['mage','knight','rogue'])for(const bodyType of ['male','female']){
 const a=createCharacter(classId,bodyType);let meshes=0;let triangles=0;a.root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert(meshes>25);assert(triangles<16000);
 a.root.position.set(4,1,-7);a.root.rotation.y=.7;animateCharacter(a,{moving:true},.14,.3);assert.deepEqual(a.root.position.toArray(),[4,1,-7]);assert.equal(a.root.rotation.y,.7);assert(Math.abs(a.joints.legL.rotation.x)>.1);
 animateCharacter(a,{parry:1},.14,.3);assert(a.joints.elbowL.rotation.x>.6);assert.equal(animationClips(a).length,7);a.dispose();
 const file=fs.readFileSync('public/assets/glb/'+classId+'-'+bodyType+'.glb');assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(8),file.length);const n=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+n).toString());assert.equal(gltf.animations.length,7);assert(gltf.meshes.length>25);for(const clip of gltf.animations){assert(clip.channels.length>15);for(const c of clip.channels)assert(gltf.nodes[c.target.node]);}
}
for(const kind of ['sword','dagger','staff','shield']){const w=createWeapon(kind);assert(w.children.length>2);disposeModel(w);}
console.log('PASS: six true-3D variants, joint movement, world transforms preserved, finite geometry, four weapons, six GLBs with seven animations each');
