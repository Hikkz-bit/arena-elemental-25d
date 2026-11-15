import * as T from '../vendor/three.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {clone as cloneSkinned} from '../vendor/SkeletonUtils.js';
import {createWeapon} from './models.js';
import {ACTIONS,LOWER_BONES,attackOf,meleeOf,pickLayers,legTwist} from './anim-state.js';
import {toonMaterial,outlineMaterial} from './toon.js';

// Sculpted, skinned characters. Each GLB carries its own copy of the 12 clips; here they are cut into
// actions, split into an upper and a lower body layer, and blended by the player state.
const loader=new GLTFLoader(),assets=new Map(),LOWER=new Set(LOWER_BONES),BASE=new URL('./glb/',import.meta.url).href;
const RUN_SPEED={mage:4.6,knight:3.8,rogue:5.8,elf:5.2},TRAIL={knight:0xbfe4ff,rogue:0x7dffd0,elf:0xfff0a8},SWINGS=new Set(['knight0','knight1','knight2','rogue2','elf0','elf1']),UP=new T.Vector3(0,1,0),RIGHT=new T.Vector3(1,0,0);
const q1=new T.Quaternion(),q2=new T.Quaternion(),q3=new T.Quaternion(),q4=new T.Vector3();

function prepare(gltf){
 const clips=new Map(gltf.animations.map(c=>[c.name,c])),actions=new Map();
 for(const [id,def] of Object.entries(ACTIONS)){
  let clip=clips.get(def.clip);if(def.from!==undefined)clip=T.AnimationUtils.subclip(clip,id,Math.round(def.from*30),Math.round(def.to*30),30);
  const lower=[],upper=[];for(const track of clip.tracks)(LOWER.has(track.name.split('.')[0])?lower:upper).push(track);
  actions.set(id,{L:new T.AnimationClip(id+'.L',clip.duration,lower),U:new T.AnimationClip(id+'.U',clip.duration,upper),duration:clip.duration});
  if(def.once)actions.set(id+'#2',{L:new T.AnimationClip(id+'.L2',clip.duration,lower),U:new T.AnimationClip(id+'.U2',clip.duration,upper),duration:clip.duration});
 }
 let triangles=0;gltf.scene.traverse(o=>{if(o.isMesh)triangles+=o.geometry.index.count/3;});
 return {scene:gltf.scene,actions,triangles};
}
// The elf has a single model.
export function loadCharacter(classId,bodyType){const key=classId+'-'+(classId==='elf'?'female':bodyType);if(!assets.has(key))assets.set(key,loader.loadAsync(BASE+key+'.glb').then(prepare));return assets.get(key);}
export const preloadCharacters=()=>Promise.all([...['mage','knight','rogue'].flatMap(c=>['male','female'].map(b=>loadCharacter(c,b))),loadCharacter('elf','female')]);

// Rotation of a bone's parent chain, in the space of the model root.
function parentRotation(bone,model,out){out.identity();for(let o=bone.parent;o&&o!==model;o=o.parent)out.premultiply(o.quaternion);return out;}
// Turn a bone around an axis given in model space (after the clip has posed it).
function turn(bone,model,axis,angle){if(Math.abs(angle)<1e-4)return;parentRotation(bone,model,q1);q2.setFromAxisAngle(axis,angle);q3.copy(q1).invert().multiply(q2).multiply(q1);bone.quaternion.premultiply(q3);}

// Fix a procedural weapon to a bone so that, in the bind pose, its long axis points `forward` and its edge points `edge` (model space).
function mount(a,boneName,kind,{forward,edge,along=8,scale=1,grip=0,out=0}){
 const bone=a.bones[boneName];if(!bone)return;
 const weapon=createWeapon(kind),y=new T.Vector3(...forward).normalize(),x=new T.Vector3(...edge).normalize(),z=new T.Vector3().crossVectors(x,y).normalize();x.crossVectors(y,z);
 const desired=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z)),boneRotation=parentRotation(bone,a.model,new T.Quaternion()).multiply(bone.quaternion);
 weapon.quaternion.copy(boneRotation.invert().multiply(desired));weapon.scale.setScalar(100*scale);weapon.position.set(0,along,0);weapon.translateY(-grip*100*scale);weapon.translateZ(-out);
 weapon.traverse(o=>{if(o.isMesh){const painted=toonMaterial(null,o.material.emissiveIntensity>1?o.material.color.clone().multiplyScalar(1.5):o.material.color);o.material.dispose();o.material=painted;a.geometries.push(o.geometry);a.materials.push(painted);}});bone.add(weapon);a.weapons.push(weapon);return weapon;
}

// A ribbon that follows the blade during a swing: the last few tip and base positions, fading out.
function createTrail(a,color){
 const n=12,geometry=new T.BufferGeometry(),index=[];for(let i=0;i<n-1;i++){const k=i*2;index.push(k,k+1,k+2,k+1,k+3,k+2);}
 geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(n*6),3));geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(n*6),3));geometry.setIndex(index);
 const material=new T.MeshBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false}),mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;a.geometries.push(geometry);a.materials.push(material);
 return {mesh,n,samples:[],color:new T.Color(color)};
}
function updateTrail(a,dt){
 const t=a.trail,scene=a.root.parent;if(!scene)return;if(t.mesh.parent!==scene)scene.add(t.mesh);t.mesh.visible=a.root.visible;
 for(const s of t.samples)s.life-=dt*4.5;while(t.samples.length&&t.samples[0].life<=0)t.samples.shift();
 if((SWINGS.has(a.attack)||a.melee)&&a.root.visible){a.root.updateMatrixWorld(true);const w=a.blade.weapon;t.samples.push({tip:w.localToWorld(new T.Vector3(0,a.blade.tip,0)),base:w.localToWorld(new T.Vector3(0,a.blade.base,0)),life:1});if(t.samples.length>t.n)t.samples.shift();}
 const position=t.mesh.geometry.attributes.position,color=t.mesh.geometry.attributes.color,count=t.samples.length;
 for(let i=0;i<t.n;i++){const s=t.samples[Math.min(i,count-1)],k=count?Math.max(0,s.life)*(i<count?(i+1)/count:0):0;if(s){position.setXYZ(i*2,s.tip.x,s.tip.y,s.tip.z);position.setXYZ(i*2+1,s.base.x,s.base.y,s.base.z);}color.setXYZ(i*2,t.color.r*k,t.color.g*k,t.color.b*k);color.setXYZ(i*2+1,t.color.r*k*.25,t.color.g*k*.25,t.color.b*k*.25);}
 position.needsUpdate=true;color.needsUpdate=true;
}
function attach(a,asset){
 const model=cloneSkinned(asset.scene),pivot=new T.Group();pivot.rotation.y=Math.PI;pivot.add(model);a.root.add(pivot);Object.assign(a,{pivot,model,asset,materials:[],geometries:[],weapons:[],bones:{},toon:[]});
 const meshes=[];model.traverse(o=>{if(o.isBone)a.bones[o.name]=o;if(o.isSkinnedMesh)meshes.push(o);});
 for(const mesh of meshes){
  const toon=toonMaterial(mesh.material.map);mesh.material=toon;mesh.castShadow=true;mesh.frustumCulled=false;a.materials.push(toon);a.toon.push(toon);a.skeleton=mesh.skeleton;
  const outline=new T.SkinnedMesh(mesh.geometry,outlineMaterial());outline.bind(mesh.skeleton,mesh.bindMatrix);outline.frustumCulled=false;mesh.parent.add(outline);outline.onBeforeRender=(renderer,scene,camera)=>{outline.material.userData.uniforms.uOutline.value=T.MathUtils.clamp(camera.position.distanceTo(q4.setFromMatrixPosition(a.root.matrixWorld))*.0015,.003,.011);};a.materials.push(outline.material);a.outline=outline;
 }
 // The model faces +Z; its right hand is on -X.
 if(a.classId==='knight'){a.blade={weapon:mount(a,'RightHand','sword',{forward:[0,.12,1],edge:[0,-1,0],grip:.035,scale:.68}),tip:1.3,base:.35};mount(a,'LeftForeArm','shield',{forward:[0,1,0],edge:[0,0,1],along:14,out:6,scale:.6});}
 else if(a.classId==='mage')mount(a,'RightHand','staff',{forward:[0,.35,1],edge:[0,-1,0],grip:.05,scale:.95});
 else if(a.classId==='elf')a.blade={weapon:mount(a,'RightHand','spear',{forward:[0,.18,1],edge:[0,-1,0],grip:.15,scale:.95}),tip:1.9,base:1.25};
 else{
  // The assassin keeps both daggers sheathed on the thighs and throws with an empty hand; one is drawn only for the stab.
  a.sheath=mount(a,'RightUpLeg','dagger',{forward:[0,-1,.12],edge:[0,0,-1],along:10,out:-11,scale:.5});mount(a,'LeftUpLeg','dagger',{forward:[0,-1,.12],edge:[0,0,-1],along:10,out:11,scale:.5});
  a.drawn=mount(a,'RightHand','dagger',{forward:[0,.1,1],edge:[0,-1,0],grip:.03,scale:.62});a.drawn.visible=false;a.blade={weapon:a.drawn,tip:.85,base:.25};
 }
 a.mixer=new T.AnimationMixer(model);a.actions=new Map();for(const [id,c] of asset.actions){a.actions.set(id+'.U',a.mixer.clipAction(c.U));a.actions.set(id+'.L',a.mixer.clipAction(c.L));}
 if(a.blade)a.trail=createTrail(a,TRAIL[a.classId]);
 a.ready=true;
}

export function createCharacter(classId='mage',bodyType='male'){
 const root=new T.Group();root.name=classId+'_'+bodyType;root.userData.asset={classId,bodyType,style:'Sculpted stylized fantasy',version:2};
 const a={root,classId,bodyType,hit:0,ready:false,disposed:false,attack:null,melee:null,meleeId:null,lastStun:0,lastGuard:0,guardPose:0,guardSide:0,guardTop:0,attackLeft:0,lastCast:0,twist:0,turnAngle:0,lean:0,ghost:0,layers:{U:{id:null,action:null},L:{id:null,action:null}},
  dispose(){a.disposed=true;a.trail?.mesh.removeFromParent();root.removeFromParent();a.mixer?.stopAllAction();for(const m of a.materials||[])m.dispose();for(const g of a.geometries||[])g.dispose();a.skeleton?.dispose();}};
 a.loaded=loadCharacter(classId,bodyType).then(asset=>{if(!a.disposed)attach(a,asset);return a;});
 return a;
}

function setLayer(a,key,id,restart,runScale){
 const layer=a.layers[key],def=ACTIONS[id];
 if(layer.id!==id||(restart&&def.once)){
  const again=layer.id===id;layer.second=again&&!layer.second;
  const next=a.actions.get(id+(layer.second?'#2':'')+'.'+key),snap=layer.id===null||layer.id==='Death',fade=def.once?.07:.16,other=a.layers[key==='U'?'L':'U'];
  next.reset();next.setLoop(def.once?T.LoopOnce:T.LoopRepeat,Infinity);next.clampWhenFinished=!!def.once;next.setEffectiveWeight(1);
  if(!def.once&&other.id===id&&other.action)next.time=other.action.time; // both halves of a loop stay in phase
  next.play();
  if(layer.action&&layer.action!==next){if(snap)layer.action.stop();else layer.action.crossFadeTo(next,fade,false);}
  layer.id=id;layer.action=next;
 }
 layer.action.timeScale=id==='Run'?runScale:def.time?a.asset.actions.get(id).duration/def.time:1;
}

// p: player snapshot plus `moving` and optionally `move:{f,s}` (velocity forward/right relative to the aim).
export function animateCharacter(a,p,time,dt=1/60){
 a.hit=Math.max(0,a.hit-dt*4);if(!a.ready)return;
 const cast=p.cast||0;let restart=false;
 if(cast>a.lastCast+.15){const id=attackOf(a.classId,p.element||0);if(id){a.attack=id;a.attackLeft=ACTIONS[id].time;restart=true;}}
 a.lastCast=cast;if(a.attack&&(a.attackLeft-=dt)<=0)a.attack=null;
 // Melee swings, stuns and blocks come straight from the server state; a new one restarts the clip.
 const melee=p.hp>0?meleeOf(a.classId,p.attack):null;if(melee&&p.attack.id!==a.meleeId){a.meleeId=p.attack.id;restart=true;}a.melee=melee&&p.attack.kind!=='guardbreak'?melee:null;
 if((p.stun||0)>a.lastStun+.1||(p.guard||0)>a.lastGuard+.1||(p.broken>0&&!a.wasBroken))restart=true;a.wasBroken=p.broken>0;a.lastStun=p.stun||0;a.lastGuard=p.guard||0;
 const layers=pickLayers({...p,classId:a.classId},a.attack),move=p.move||{f:p.moving?1:0,s:0},legs=legTwist(move.f,move.s),running=layers.lower==='Run';
 const runScale=RUN_SPEED[a.classId]/4.2*(p.slow>0?.55:1)*(legs.backwards?-.85:1);
 setLayer(a,'L',layers.lower,restart,runScale);setLayer(a,'U',layers.upper,restart,runScale);
 for(const key of ['L','U'])if(a.layers[key].id==='Walk')a.layers[key].action.timeScale=legs.backwards?-1.15:1.15;
 a.mixer.update(dt);
 const ease=1-Math.exp(-dt*14),dodge=p.burst?.kind==='dodge',dash=layers.lower==='Dash',alive=p.hp>0;
 // Legs follow the direction of travel while the torso keeps aiming.
 a.twist+=((running||layers.lower==='Walk'?legs.angle:0)-a.twist)*ease;
 if(Math.abs(a.twist)>1e-3){const hips=a.bones.Hips,spine=a.bones.Spine02;q2.setFromAxisAngle(UP,-a.twist);hips.quaternion.premultiply(q2);q3.copy(hips.quaternion).invert();q2.setFromAxisAngle(UP,a.twist);q3.multiply(q2).multiply(hips.quaternion);spine.quaternion.premultiply(q3);}
 // The dash roll faces where it travels; it eases back to the aim afterwards.
 if(dodge)a.turnAngle=p.burst.angle||0;else a.turnAngle+=(0-a.turnAngle)*ease;a.pivot.rotation.y=Math.PI-a.turnAngle;
 // Lean into a sprint, bend back when hit, and follow the vertical aim.
 a.lean+=((dash?.5:0)-a.lean)*ease;const pitch=alive&&!dodge?(p.pitch||0):0;
 // Guard pose: the torso and the weapon arm show which side is being guarded (0 left, 1 top, 2 right).
 const guarding=alive&&!dodge&&!dash&&!melee&&!a.attack&&!(p.stun>0),stance=p.stance??1;a.guardPose+=((guarding?1:0)-a.guardPose)*ease;a.guardSide+=((stance-1)-a.guardSide)*ease;a.guardTop+=((stance===1?1:0)-a.guardTop)*ease;
 if(a.guardPose>.01){turn(a.bones.Spine,a.model,UP,-a.guardSide*.34*a.guardPose);turn(a.bones.RightArm,a.model,RIGHT,-.55*a.guardTop*a.guardPose);turn(a.bones.RightArm,a.model,UP,-a.guardSide*.45*a.guardPose);}
 turn(a.bones.Spine02,a.model,RIGHT,a.lean-a.hit*.28);turn(a.bones.Spine,a.model,RIGHT,-pitch*.32);turn(a.bones.Head,a.model,RIGHT,-pitch*.22);
 if(a.drawn){const stab=a.attack==='rogue2'||!!melee;a.drawn.visible=stab;a.sheath.visible=!stab;}
 if(a.trail)updateTrail(a,dt);
 a.ghost+=((dash?1:0)-a.ghost)*(1-Math.exp(-dt*20));for(const m of a.toon){m.userData.uniforms.uHit.value=a.hit;m.userData.uniforms.uGhost.value=a.ghost;}
}

export function disposeModel(root){root.removeFromParent();}
