import * as T from '../vendor/three.js';
import {animateCharacter} from './models.js';

// Bake the same joint poses used in the game into portable glTF animations.
export function animationClips(asset){
 const clips=[];
 for(const name of ['Idle','Run','Jump','Ability1','Ability2','Ability3','Parry']){
  const duration=name==='Idle'?Math.PI*2/2.4:name==='Run'?Math.PI*2/(asset.classId==='rogue'?13:10):name==='Jump'?1:.8;
  const frames=Math.ceil(duration*30),times=[],channels=new Map();asset.walk=0;asset.action=0;asset.hit=0;
  for(const [o] of asset.base)channels.set(o,{quaternion:[],position:[]});
  for(let i=0;i<=frames;i++){const t=i/frames*duration;times.push(t);const ability=name.startsWith('Ability'),progress=t/duration;
   animateCharacter(asset,{moving:name==='Run',y:name==='Jump'&&progress>.08&&progress<.9?.3:0,cast:ability?.42*(1-progress):0,element:ability?Number(name.slice(-1))-1:0,parry:name==='Parry'&&progress>.1&&progress<.65?1:0},t,1);
   if(name==='Jump')asset.joints.hips.position.y+=Math.sin(progress*Math.PI)*.3;
   for(const [o,c] of channels){c.quaternion.push(...o.quaternion.toArray());c.position.push(...o.position.toArray());}
  }
  if(name==='Idle'||name==='Run')for(const c of channels.values()){c.quaternion.splice(c.quaternion.length-4,4,...c.quaternion.slice(0,4));c.position.splice(c.position.length-3,3,...c.position.slice(0,3));}
  const tracks=[];for(const [o,c] of channels){tracks.push(new T.QuaternionKeyframeTrack(o.name+'.quaternion',times,c.quaternion));if(o===asset.joints.hips)tracks.push(new T.VectorKeyframeTrack(o.name+'.position',times,c.position));}
  clips.push(new T.AnimationClip(name,duration,tracks));
 }
 for(const [o,b] of asset.base){o.position.copy(b.position);o.rotation.copy(b.rotation);}asset.walk=asset.action=0;return clips;
}
