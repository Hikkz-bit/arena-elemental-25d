// Builds the shipped character GLBs from the raw rigged files.
//   node scripts/prepare-assets.mjs [rawDir=.local/rig]
// Raw layout: <rawDir>/<class>-<body>.glb (rigged, bind pose) and <rawDir>/knight-male/<Clip>.glb
// (the same rig with one library animation each). Every clip is retargeted to every character by
// world-space rotation deltas from the bind pose, so one set of clips serves all six skeletons.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import * as T from '../public/vendor/three.js';

const RAW=process.argv[2]||'.local/rig',OUT='public/assets/glb',SOURCE='knight-male',FPS=30,TEXTURE=1536;
const CHARACTERS=['knight-male','knight-female','mage-male','mage-female','rogue-male','rogue-female','elf-female'];
// root: which parts of the hips translation survive. 'y' keeps the bob but no travel (the game moves the
// character), 'xyz' keeps falls (attacks stay in place so they never slide or snap back), 'none' keeps the pose only. cut trims to [start,end] seconds.
export const CLIPS=[
 {name:'Idle',file:'Idle',root:'y'},
 {name:'Run',file:'Run',root:'y'},
 {name:'Jump',file:'Jump',root:'none',cut:[.62,1.1]},
 {name:'Slash',file:'Slash',root:'y'},
 {name:'Thrust',file:'Thrust',root:'y'},
 {name:'Slam',file:'Slam',root:'y'},
 {name:'CastPush',file:'CastPush',root:'y'},
 {name:'CastFling',file:'CastFling',root:'y'},
 {name:'CastSky',file:'CastSky',root:'y'},
 {name:'Roll',file:'Roll',root:'y'},
 {name:'Parry',file:'Parry',root:'y'},
 {name:'Death',file:'Death',root:'xyz'},
 {name:'LeftSlash',file:'LeftSlash',root:'y'},
 {name:'Overhead',file:'Overhead',root:'y'},
 {name:'WideSlash',file:'WideSlash',root:'y'},
 {name:'Hammer',file:'Hammer',root:'y'},
 {name:'Block',file:'Block',root:'y'},
 {name:'Bash',file:'Bash',root:'y'},
 {name:'Kick',file:'Kick',root:'y'},
 {name:'Stagger',file:'Stagger',root:'y'},
 {name:'GuardWalk',file:'GuardWalk',root:'y'}
];

const SIZE={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},COMPONENTS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function readGlb(file){const f=fs.readFileSync(file),jl=f.readUInt32LE(12),json=JSON.parse(f.subarray(20,20+jl).toString('utf8')),bl=f.readUInt32LE(20+jl);return {json,bin:f.subarray(28+jl,28+jl+bl)};}
function raw(g,i){const a=g.json.accessors[i],bv=g.json.bufferViews[a.bufferView],es=SIZE[a.componentType]*COMPONENTS[a.type],stride=bv.byteStride||es,off=(bv.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(es*a.count);for(let k=0;k<a.count;k++)g.bin.copy(out,k*es,off+k*stride,off+k*stride+es);return out;}
function floats(g,i){const b=raw(g,i);return new Float32Array(b.buffer,b.byteOffset,b.length/4);}
function nodeMatrix(n){const m=new T.Matrix4();if(n.matrix)return m.fromArray(n.matrix);return m.compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));}

// Bind pose of a rigged file: world matrix of every joint, from the inverse bind matrices.
function readRig(g){
 const j=g.json,skin=j.skins[0],ibm=floats(g,skin.inverseBindMatrices),parentOf=new Map();j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parentOf.set(c,i)));
 const world=i=>{let m=nodeMatrix(j.nodes[i]);for(let p=parentOf.get(i);p!==undefined;p=parentOf.get(p))m=nodeMatrix(j.nodes[p]).multiply(m);return m;};
 // glTF ignores the skinned mesh node transform, so the inverse of each inverse bind matrix is the joint's world bind matrix.
 const meshNode=j.nodes.findIndex(n=>n.skin!==undefined);
 const bones=skin.joints.map((node,k)=>{const bind=new T.Matrix4().fromArray(ibm,k*16).invert(),q=new T.Quaternion();bind.decompose(new T.Vector3(),q,new T.Vector3());return {node,name:j.nodes[node].name,bind,q};});
 const byNode=new Map(bones.map(b=>[b.node,b]));for(const b of bones)b.parent=byNode.get(parentOf.get(b.node))||null;
 const order=[];const visit=b=>{if(order.includes(b))return;if(b.parent)visit(b.parent);order.push(b);};bones.forEach(visit);
 const hips=bones.find(b=>!b.parent),armature=world(parentOf.get(hips.node));
 hips.local=armature.clone().invert().multiply(hips.bind);for(const b of bones)if(b.parent)b.local=b.parent.bind.clone().invert().multiply(b.bind);
 return {bones:order,byName:new Map(bones.map(b=>[b.name,b])),hips,parentOf,meshNode};
}

// Source clip as world-space rotation deltas from the bind pose, resampled at a fixed rate.
function readClip(file,cut){
 const g=readGlb(file),j=g.json,rig=readRig(g),anim=j.animations[0],tracks=new Map();let end=0;
 for(const c of anim.channels){const s=anim.samplers[c.sampler],times=floats(g,s.input);end=Math.max(end,times[times.length-1]);tracks.set(c.target.node+'/'+c.target.path,{times,values:floats(g,s.output)});}
 const [from,to]=cut||[0,end],frames=Math.max(1,Math.round((to-from)*FPS)),qa=new T.Quaternion(),qb=new T.Quaternion(),va=new T.Vector3(),vb=new T.Vector3();
 const at=(track,t,n)=>{const {times,values}=track;let i=0;while(i<times.length-2&&times[i+1]<t)i++;const next=Math.min(i+1,times.length-1),f=next===i?0:Math.min(1,Math.max(0,(t-times[i])/(times[next]-times[i])));return n===4?qa.fromArray(values,i*4).slerp(qb.fromArray(values,next*4),f):va.fromArray(values,i*3).lerp(vb.fromArray(values,next*3),f);};
 const restHips=new T.Vector3().setFromMatrixPosition(rig.hips.local),out={times:[],delta:new Map(rig.bones.map(b=>[b.name,[]])),hips:[]};
 for(let f=0;f<=frames;f++){
  const t=from+(to-from)*f/frames,world=new Map();out.times.push((to-from)*f/frames);
  for(const b of rig.bones){const track=tracks.get(b.node+'/rotation'),local=track?at(track,t,4).clone():new T.Quaternion(...(j.nodes[b.node].rotation||[0,0,0,1])),w=b.parent?world.get(b.parent).clone().multiply(local):local;world.set(b,w);out.delta.get(b.name).push(w.clone().multiply(b.q.clone().invert()));}
  const track=tracks.get(rig.hips.node+'/translation');out.hips.push(track?at(track,t,3).clone().sub(restHips).divideScalar(restHips.y):new T.Vector3());
 }
 out.animated=new Set(rig.bones.filter(b=>tracks.has(b.node+'/rotation')).map(b=>b.name));return out;
}

function build(name,clips){
 const file=name===SOURCE?path.join(RAW,SOURCE,'Idle.glb'):path.join(RAW,name+'.glb'),g=readGlb(file),j=g.json,rig=readRig(g),prim=j.meshes[j.nodes[rig.meshNode].mesh].primitives[0];
 const chunks=[],views=[],accessors=[];let length=0;
 const view=(buf,target)=>{const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}views.push({buffer:0,byteOffset:length,byteLength:buf.length,...(target?{target}:{})});chunks.push(buf);length+=buf.length;return views.length-1;};
 const accessor=(buf,meta,target)=>{accessors.push({bufferView:view(buf,target),...meta});return accessors.length-1;};
 const copy=(i,target)=>{const {componentType,type,count,min,max,normalized}=j.accessors[i];return accessor(raw(g,i),{componentType,type,count,...(min?{min,max}:{}),...(normalized?{normalized}:{})},target);};
 const f32=(array,type,extra={})=>accessor(Buffer.from(new Float32Array(array).buffer),{componentType:5126,type,count:array.length/COMPONENTS[type],...extra});
 const attributes={};for(const key of ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'])attributes[key]=copy(prim.attributes[key],34962);
 const indices=copy(prim.indices,34963),skin=j.skins[0],inverseBind=copy(skin.inverseBindMatrices);
 // Texture: resized and recompressed; the toon shader does not need the original 2-4K bake.
 const image=j.images[j.textures[j.materials[prim.material].pbrMetallicRoughness.baseColorTexture.index].source],iv=j.bufferViews[image.bufferView],tmp=fs.mkdtempSync(path.join(os.tmpdir(),'arena-tex-')),src=path.join(tmp,'in.img'),dst=path.join(tmp,'out.jpg');
 fs.writeFileSync(src,g.bin.subarray(iv.byteOffset||0,(iv.byteOffset||0)+iv.byteLength));execFileSync('ffmpeg',['-v','error','-y','-i',src,'-vf',`scale=${TEXTURE}:${TEXTURE}:flags=lanczos`,'-q:v','3',dst]);const imageView=view(fs.readFileSync(dst));fs.rmSync(tmp,{recursive:true,force:true});
 // Nodes keep their indices; joints are reset to the bind pose so the file is a clean rest pose.
 const nodes=j.nodes.map(n=>({...n}));for(const b of rig.bones){const p=new T.Vector3(),q=new T.Quaternion();b.local.decompose(p,q,new T.Vector3());const n=nodes[b.node];delete n.matrix;n.translation=p.toArray();n.rotation=q.toArray();n.scale=[1,1,1];}
 const restHips=new T.Vector3().setFromMatrixPosition(rig.hips.local),animations=[];
 for(const [config,clip] of clips){
  const times=f32(clip.times,'SCALAR',{min:[0],max:[clip.times[clip.times.length-1]]}),channels=[],samplers=[],world=clip.times.map(()=>new Map());
  const add=(node,pathName,output)=>{samplers.push({input:times,output,interpolation:'LINEAR'});channels.push({sampler:samplers.length-1,target:{node,path:pathName}});};
  for(const b of rig.bones){
   const delta=clip.delta.get(b.name),values=[];let last=null;
   for(let f=0;f<clip.times.length;f++){const w=(delta?delta[f].clone():new T.Quaternion()).multiply(b.q);world[f].set(b,w);const local=b.parent?world[f].get(b.parent).clone().invert().multiply(w):w.clone();if(last&&last.dot(local)<0)local.set(-local.x,-local.y,-local.z,-local.w);last=local;values.push(local.x,local.y,local.z,local.w);}
   if(clip.animated.has(b.name))add(b.node,'rotation',f32(values,'VEC4'));
  }
  const keep=config.root,hips=[];for(const offset of clip.hips){const o=offset.clone().multiplyScalar(restHips.y);hips.push(restHips.x+(keep==='xyz'?o.x:0),restHips.y+(keep==='none'?0:o.y),restHips.z+(keep==='xyz'?o.z:0));}
  add(rig.hips.node,'translation',f32(hips,'VEC3'));animations.push({name:config.name,channels,samplers});
 }
 const material={name:name,pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.9},doubleSided:false};
 const json={asset:{version:'2.0',generator:'Arena Elemental prepare-assets'},scene:0,scenes:j.scenes,nodes,meshes:[{name,primitives:[{attributes,indices,material:0}]}],materials:[material],textures:[{source:0,sampler:0}],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],images:[{bufferView:imageView,mimeType:'image/jpeg'}],skins:[{joints:skin.joints,inverseBindMatrices:inverseBind,skeleton:rig.hips.node}],accessors,bufferViews:views,buffers:[{byteLength:length}],animations};
 nodes[rig.meshNode].mesh=0;nodes[rig.meshNode].skin=0;
 let text=Buffer.from(JSON.stringify(json));if(text.length%4)text=Buffer.concat([text,Buffer.alloc(4-text.length%4,' ')]);let bin=Buffer.concat(chunks);if(bin.length%4)bin=Buffer.concat([bin,Buffer.alloc(4-bin.length%4)]);json.buffers[0].byteLength=bin.length;text=Buffer.from(JSON.stringify(json));if(text.length%4)text=Buffer.concat([text,Buffer.alloc(4-text.length%4,' ')]);
 const glb=Buffer.alloc(28+text.length+bin.length);glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(text.length,12);glb.writeUInt32LE(0x4e4f534a,16);text.copy(glb,20);glb.writeUInt32LE(bin.length,20+text.length);glb.writeUInt32LE(0x004e4942,24+text.length);bin.copy(glb,28+text.length);
 fs.writeFileSync(path.join(OUT,name+'.glb'),glb);
 return {file:name+'.glb',bytes:glb.length,triangles:j.accessors[prim.indices].count/3,bones:skin.joints.length,animations:animations.map(a=>a.name)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/prepare-assets.mjs')){
 const clips=CLIPS.map(config=>[config,readClip(path.join(RAW,SOURCE,config.file+'.glb'),config.cut)]);
 const manifest=JSON.parse(fs.readFileSync(path.join(OUT,'..','manifest.json'),'utf8'));manifest.version=2;manifest.description='Sculpted, skinned 3D characters with skeletal animation. Metres, Y up, facing +Z. Cosmetic variants share gameplay stats.';manifest.characters=[];
 for(const name of CHARACTERS){const [classId,bodyType]=name.split('-'),info=build(name,clips);manifest.characters.push({classId,bodyType,...info});console.log(name,(info.bytes/1e6).toFixed(2)+' MB',info.triangles+' tris',info.animations.length+' clips');}
 fs.writeFileSync(path.join(OUT,'..','manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
