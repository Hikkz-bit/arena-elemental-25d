// Which animation plays, decided from the player state the server already sends.
// No rendering here, so the rules are tested in Node (scripts/test-assets.mjs).

// The skeleton is split in two layers so a character can run with the legs while the torso attacks or blocks.
export const LOWER_BONES=['Hips','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'];

// clip: name inside the GLB. from/to: seconds of the clip that are used. time: how long that window takes on screen
// (the strike lands early because the server applies the hit the moment the ability fires).
// full: the legs also play it even while moving.
export const ACTIONS={
 Idle:{clip:'Idle'},
 Run:{clip:'Run'},
 Jump:{clip:'Jump',time:.7,once:true},
 Parry:{clip:'Parry',from:.3,to:1.5},
 Roll:{clip:'Roll',from:.55,to:1.55,time:.45,once:true},
 Dash:{clip:'Run',time:.36},
 Death:{clip:'Death',time:1.7,once:true},
 // Duel moves. The window of each clip is chosen so the blade lands exactly when the server resolves the hit.
 Walk:{clip:'GuardWalk'},
 Block:{clip:'Block',from:.5,to:1.05,time:.35,once:true},
 Stagger:{clip:'Stagger',from:.4,to:1.4,time:.8,once:true},
 Broken:{clip:'Stagger',from:.45,to:.95,time:.45,once:true},
 light0:{clip:'LeftSlash',from:1.11,to:1.66,time:.42,once:true},
 light1:{clip:'Overhead',from:.71,to:1.26,time:.42,once:true},
 light2:{clip:'Slash',from:.66,to:1.21,time:.42,once:true},
 heavy0:{clip:'LeftSlash',from:.82,to:1.77,time:.82,once:true},
 heavy1:{clip:'Hammer',from:.92,to:1.87,time:.82,once:true},
 heavy2:{clip:'WideSlash',from:.28,to:1.22,time:.82,once:true},
 bash:{clip:'Bash',from:.77,to:1.63,time:.72,once:true},
 kick:{clip:'Kick',from:.37,to:1.14,time:.72,once:true},
 knight0:{clip:'Slash',from:.5,to:1.3,time:.5,once:true},
 knight1:{clip:'Thrust',from:1.3,to:2.2,time:.5,once:true,full:true},
 knight2:{clip:'Slam',from:1.1,to:2.6,time:.8,once:true,full:true},
 mage0:{clip:'CastPush',from:.7,to:1.9,time:.6,once:true},
 mage1:{clip:'CastFling',from:.6,to:1.6,time:.55,once:true},
 mage2:{clip:'CastSky',from:.4,to:1.7,time:.8,once:true},
 rogue0:{clip:'Slash',from:.72,to:1.3,time:.42,once:true},
 rogue2:{clip:'Thrust',from:1.35,to:2.2,time:.45,once:true},
 elf0:{clip:'Thrust',from:1.35,to:2.2,time:.45,once:true},
 elf1:{clip:'Thrust',from:1.3,to:2.2,time:.5,once:true,full:true},
 elf2:{clip:'CastPush',from:.7,to:1.9,time:.6,once:true}
};
export const CLIP_NAMES=['Idle','Run','Jump','Slash','Thrust','Slam','CastPush','CastFling','CastSky','Roll','Parry','Death','LeftSlash','Overhead','WideSlash','Hammer','Block','Bash','Kick','Stagger','GuardWalk'];

// The attack action for an ability slot, or null when that slot has no swing of its own (the rogue's shadow step).
export const attackOf=(classId,element)=>Object.hasOwn(ACTIONS,classId+element)?classId+element:null;

// The action for a melee attack from the server ({kind, dir}): the knight breaks guards with the shield, the others kick.
export const meleeOf=(classId,attack)=>!attack?null:attack.kind==='guardbreak'?(classId==='knight'?'bash':'kick'):attack.kind+attack.dir;

// p: player snapshot plus `moving`. attack: id of the ability animation still playing, or null.
export function pickLayers(p,attack){
 if(p.hp<=0)return {upper:'Death',lower:'Death'};
 const kind=p.burst?.kind;
 if(kind==='dodge')return {upper:'Roll',lower:'Roll'};
 if(kind==='dash')return {upper:'Dash',lower:'Dash'};
 if(p.broken>0)return {upper:'Broken',lower:'Broken'};
 if(p.stun>0)return {upper:'Stagger',lower:'Stagger'};
 const melee=meleeOf(p.classId,p.attack);if(melee)return {upper:melee,lower:melee};
 const air=p.y>.1,base=air?'Jump':p.moving?(p.guardMode?'Walk':'Run'):'Idle';
 if(p.guard>0)return {upper:'Block',lower:base};
 if(attack)return {upper:attack,lower:ACTIONS[attack].full||(!p.moving&&!air)?attack:base};
 if(p.parry>0||p.parryFlash>0)return {upper:'Parry',lower:base};
 return {upper:base,lower:base};
}

// Movement relative to where the character looks: forward f and right s, any length.
// Returns how far the legs turn away from the aim (radians, right positive) and whether they run backwards.
export function legTwist(f,s,limit=1.05){
 if(Math.hypot(f,s)<.05)return {angle:0,backwards:false};
 let angle=Math.atan2(s,f),backwards=false;
 if(Math.abs(angle)>1.75){backwards=true;angle-=Math.sign(angle)*Math.PI;}
 return {angle:Math.max(-limit,Math.min(limit,angle)),backwards};
}
