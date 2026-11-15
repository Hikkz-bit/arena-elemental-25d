import {classOf} from '../public/catalog.js';
import {motion,move,forward,clamp,segmentDistance,PILLARS} from '../public/physics.js';
export const MAX=3,GOAL=5;
// Universal dash (Shift): short burst along the held direction with brief invulnerability, like the dodge of arena brawlers.
export const DASH={range:2.8,duration:.2,cooldown:1,inv:.2};
const idle=()=>({forward:0,strafe:0,jump:false,parry:false,dash:false,light:false,heavy:false,guardbreak:false,guard:false,fire:[false,false,false]});
const spawn=slot=>[[-6,6],[6,6],[0,-7]][slot];
function place(p){const [x,z]=spawn(p.slot);Object.assign(p,{x,z,y:0,vy:0,yaw:Math.atan2(-x,z),pitch:0});}
export function newRoom(code,now){return {code,mapId:'abbey',phase:'lobby',players:[],shots:[],bolts:[],events:[],eid:0,host:null,last:now,elapsed:0,round:0,winner:null};}
export function newPlayer(id,hash,name,slot,now){const p={id,hash,name,slot,classId:'mage',bodyType:'male',maxHp:100,hp:100,speed:115,kills:0,deaths:0,seen:now,input:idle(),seq:-1,cd:[0,0,0],cast:0,element:0,parry:0,parryCd:0,parryFlash:0,parryHeld:false,parryQueued:false,dashCd:0,dashHeld:false,dashQueued:false,stance:1,stanceAge:9,posture:0,postureWait:0,broken:0,attack:null,stun:0,guard:0,guardMode:false,buffered:null,slow:0,inv:0,respawn:0,burst:null,moving:false};place(p);return p;}
function event(s,type,data){s.events.push({id:++s.eid,type,...data});s.events=s.events.slice(-60);}
export function reset(s,now){Object.assign(s,{round:s.round+1,phase:'countdown',countdown:3,elapsed:0,winner:null,shots:[],bolts:[],last:now});for(const p of s.players){const c=classOf(p.classId);Object.assign(p,{hp:c.hp,maxHp:c.hp,speed:c.speed,kills:0,deaths:0,cd:[0,0,0],input:idle(),cast:0,inv:0,slow:0,respawn:0,burst:null,parry:0,parryCd:0,parryFlash:0,parryQueued:false,parryHeld:false,dashCd:0,dashQueued:false,dashHeld:false,posture:0,postureWait:0,broken:0,attack:null,stun:0,guard:0,buffered:null});place(p);}event(s,'round',{});}
function dodge(s,p,input){const f=forward(p.yaw),fw=input.forward||0,st=input.strafe||0,len=Math.hypot(fw,st),a=len?fw/len:1,b=len?st/len:0,dx=f.x*a+Math.cos(p.yaw)*b,dz=f.z*a+Math.sin(p.yaw)*b;p.dashCd=DASH.cooldown;p.inv=Math.max(p.inv,DASH.inv);event(s,'dash',{owner:p.id,x:p.x,y:p.y+.9,z:p.z,yaw:p.yaw});p.burst={id:s.eid,kind:'dodge',angle:Math.atan2(b,a),fromX:p.x,fromZ:p.z,previousX:p.x,previousZ:p.z,toX:clamp(p.x+dx*DASH.range,-11.5,11.5),toZ:clamp(p.z+dz*DASH.range,-9.5,9.5),elapsed:0,duration:DASH.duration,damage:0,hits:[]};}
function damage(s,p,amount,owner,slow=0){if(s.phase!=='playing'||p.hp<=0||p.inv>0||s.last-p.seen>=8000)return;if(p.parry>0){p.parryCd=0;p.parryFlash=.35;event(s,'parry',{target:p.id,x:p.x,y:p.y+1,z:p.z});return;}p.hp=Math.max(0,p.hp-amount);p.slow=Math.max(p.slow,slow);event(s,'hit',{target:p.id,owner,amount,x:p.x,y:p.y+1,z:p.z});if(p.hp===0){p.deaths++;p.respawn=2.5;p.burst=null;p.input=idle();const a=s.players.find(q=>q.id===owner);if(a&&a.id!==p.id){a.kills++;if(a.kills>=GOAL){s.phase='finished';s.winner=a.id;}}event(s,'ko',{target:p.id,owner});}}
function fire(s,p,i){if(p.cd[i]>0||p.burst||p.stun>0||p.attack||s.phase!=='playing')return;const a=classOf(p.classId).abilities[i],f=forward(p.yaw);p.cd[i]=a.cooldown;p.cast=.42;p.element=i;event(s,'cast',{owner:p.id,kind:a.kind,x:p.x,y:p.y+1.3,z:p.z,yaw:p.yaw});
 if(['fire','ice','dagger','light'].includes(a.kind)){const speed={fire:11,ice:15,dagger:19,light:24}[a.kind],cp=Math.cos(p.pitch);s.shots.push({id:s.eid,owner:p.id,kind:a.kind,damage:a.damage,x:p.x+f.x*.7,y:p.y+1.45,z:p.z+f.z*.7,vx:f.x*cp*speed,vy:Math.sin(p.pitch)*speed,vz:f.z*cp*speed,life:2});}
 else if(a.kind==='bolt'){const targets=s.players.filter(q=>q.id!==p.id&&q.hp>0&&s.last-q.seen<8000).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));const q=targets[0],x=q?.x??p.x+f.x*5,z=q?.z??p.z+f.z*5;s.bolts.push({id:s.eid,owner:p.id,x,z,t:.76,damage:a.damage});event(s,'bolt',{x,z});}
 else if(a.kind==='dash'||a.kind==='charge'){const range=a.range/20;p.burst={id:s.eid,kind:a.kind,fromX:p.x,fromZ:p.z,previousX:p.x,previousZ:p.z,toX:clamp(p.x+f.x*range,-11.5,11.5),toZ:clamp(p.z+f.z*range,-9.5,9.5),elapsed:0,duration:a.duration,damage:a.damage,hits:[]};}
 else{event(s,'ability',{owner:p.id,kind:a.kind,x:p.x,y:p.y+.1,z:p.z,yaw:p.yaw,range:a.range/20});for(const q of s.players){const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);if(q.id===p.id||Math.abs(p.y-q.y)>1.8||d>a.range/20||(a.kind!=='quake'&&(dx*f.x+dz*f.z)/(d||1)<.25))continue;const qf=forward(q.yaw),bonus=a.kind==='backstab'&&f.x*qf.x+f.z*qf.z>.5?18:0;damage(s,q,a.damage+bonus,p.id);}}
}
// Duel rules. Every fighter holds a guard in one of three directions (0 left, 1 top, 2 right) and swings from that side.
// An attack is blocked when the defender faces the attacker, is not swinging or stunned, and guards the side it comes from
// (the attacker's right is the defender's left). Attacks cost nothing and chain into each other, so the fight keeps moving;
// what wears a fighter down is POSTURE. Blocking fills the blocker's posture. Moving the guard to the right side just before
// the blow lands (or pressing parry) is a deflection: it costs the defender nothing and fills the attacker's posture instead.
// When posture is full the guard collapses, and the next blow that lands on a collapsed fighter is a deathblow.
export const COMBAT={posture:100,postureDelay:1,postureRecover:18,hitstun:.2,deflectWindow:.22,blockRecover:.28,deflectRecover:.42,chip:3,buffer:.4,broken:1.3,deathblow:3,chain:.45,
 light:{windup:.22,recover:.2,damage:14,posture:16,range:2.7,lunge:.7},
 heavy:{windup:.5,recover:.32,damage:30,posture:30,range:3,lunge:1},
 guardbreak:{windup:.32,recover:.4,damage:0,posture:35,range:1.9,lunge:.6,stun:.7}};
export const mirror=direction=>2-direction;
function strain(s,p,amount){
 p.posture=Math.min(COMBAT.posture,p.posture+amount);p.postureWait=COMBAT.postureDelay;
 if(p.posture>=COMBAT.posture&&p.broken<=0&&p.hp>0){p.broken=COMBAT.broken;p.stun=Math.max(p.stun,COMBAT.broken);p.attack=null;event(s,'break',{target:p.id,x:p.x,y:p.y+1,z:p.z});}
}
function blocks(q,p,direction){const dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz)||1,f=forward(q.yaw);return q.stun<=0&&!q.attack&&!q.burst&&q.stance===mirror(direction)&&(dx*f.x+dz*f.z)/d>.2;}
function strike(s,p,a,spec){
 const f=forward(p.yaw);
 for(const q of s.players){
  const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
  if(q.id===p.id||q.hp<=0||Math.abs(p.y-q.y)>1.8||d>spec.range||(dx*f.x+dz*f.z)/(d||1)<.3||q.inv>0||s.last-q.seen>=8000)continue;
  const at={x:q.x,y:q.y+1,z:q.z};
  if(a.kind==='guardbreak'){if(q.attack&&!q.attack.done){a.extra=.35;event(s,'clash',{owner:p.id,target:q.id,...at});}else{q.stun=Math.max(q.stun,spec.stun);q.attack=null;event(s,'guardbreak',{owner:p.id,target:q.id,...at});strain(s,q,spec.posture);}continue;}
  if(q.broken>0){q.broken=0;q.posture=40;event(s,'deathblow',{owner:p.id,target:q.id,...at});damage(s,q,spec.damage*COMBAT.deathblow,p.id);continue;}
  const guarded=blocks(q,p,a.dir),parried=q.parry>0;
  if(parried||(guarded&&q.stanceAge<=COMBAT.deflectWindow)){
   q.guard=.3;event(s,'deflect',{owner:p.id,target:q.id,dir:a.dir,...at});
   if(parried){q.parryCd=0;q.parryFlash=.35;p.stun=Math.max(p.stun,.45);p.attack=null;}else a.extra=COMBAT.deflectRecover;
   strain(s,p,spec.posture+12);if(!p.attack)return;continue;
  }
  if(guarded){q.guard=.3;a.extra=COMBAT.blockRecover;if(a.kind==='heavy')q.hp=Math.max(1,q.hp-COMBAT.chip);event(s,'block',{owner:p.id,target:q.id,dir:a.dir,...at});strain(s,q,spec.posture);continue;}
  if(q.attack&&!q.attack.done&&q.attack.kind!=='heavy')q.attack=null;
  q.stun=Math.max(q.stun,COMBAT.hitstun);strain(s,q,spec.posture*.6);damage(s,q,spec.damage,p.id);
 }
}
function combat(s,p,input,dt){
 p.guardMode=!!input.guard;p.stanceAge+=dt;
 if(p.broken>0&&(p.broken-=dt)<=0){p.broken=0;p.posture=40;}
 if(p.postureWait<=0&&p.broken<=0)p.posture=Math.max(0,p.posture-COMBAT.postureRecover*(p.hp<p.maxHp*.4?.5:1)*dt);
 // A press made while busy is remembered for a moment, so strings of attacks do not need frame-perfect timing.
 for(const kind of ['guardbreak','heavy','light']){const on=p[kind+'Queued']||(input[kind]&&!p[kind+'Held']);p[kind+'Queued']=false;p[kind+'Held']=!!input[kind];if(on)p.buffered={kind,left:COMBAT.buffer};}
 if(p.buffered&&(p.buffered.left-=dt)<0)p.buffered=null;
 const now=p.attack,spent=now&&now.done&&now.t>=COMBAT[now.kind].windup+COMBAT[now.kind].recover*COMBAT.chain+now.extra;
 if((!now||now.done)&&[0,1,2].includes(input.stance)&&input.stance!==p.stance){p.stance=input.stance;p.stanceAge=0;}
 // The next attack may start before the last one has fully recovered: that is what makes strings flow.
 if(p.buffered&&p.stun<=0&&!p.burst&&(!now||spent)){const kind=p.buffered.kind;p.buffered=null;event(s,'swing',{owner:p.id,kind,dir:p.stance,x:p.x,y:p.y+1.2,z:p.z,yaw:p.yaw});p.attack={id:s.eid,kind,dir:p.stance,t:0,done:false,extra:0};}
 const a=p.attack;if(!a)return;const spec=COMBAT[a.kind];a.t+=dt;
 if(!a.done){const f=forward(p.yaw),step=spec.lunge*dt/spec.windup;move(p,f.x*step,f.z*step);if(a.t>=spec.windup){a.done=true;strike(s,p,a,spec);}}
 if(p.attack===a&&a.t>=spec.windup+spec.recover+a.extra)p.attack=null;
}
// Training rivals: they face the nearest player and change guard now and then. The aggressive one closes in, attacks in
// short strings, and sometimes reads an incoming blow and moves its guard in time (which may turn into a deflection).
function botThink(s,p,dt){
 const ai=p.ai??={think:1.5,stance:0,chain:0,react:-1,seen:null},input=p.input,target=s.players.filter(q=>!q.bot&&q.hp>0&&s.last-q.seen<8000).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
 Object.assign(input,{forward:0,strafe:0,light:false,heavy:false,guardbreak:false,guard:true});if(!target)return;
 const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);input.yaw=Math.atan2(dx,-dz);
 const threat=target.attack&&!target.attack.done&&target.attack.kind!=='guardbreak'?target.attack:null;
 if(threat&&ai.seen!==threat.id){ai.seen=threat.id;ai.react=Math.random()<(p.aggressive?.5:.7)?.08+Math.random()*.16:-1;}
 if(threat&&ai.react>=0&&(ai.react-=dt)<0){input.stance=mirror(threat.dir);ai.stance=.9;}
 if((ai.stance-=dt)<=0){input.stance=Math.floor(Math.random()*3);ai.stance=1+Math.random()*1.5;}
 if(!p.aggressive)return;if(d>2.3)input.forward=1;
 if((ai.think-=dt)<=0&&d<3){const r=Math.random();input.light=r<.62;input.heavy=r>=.62&&r<.9;input.guardbreak=r>=.9;if(ai.chain>0)ai.chain--;else ai.chain=Math.random()<.4?1+Math.floor(Math.random()*2):0;ai.think=ai.chain>0?.34:1.3+Math.random()*1.4;}
}
function tick(s,dt,now){for(const p of s.players)if(p.bot)p.seen=now;if(s.phase==='countdown'){s.countdown-=dt;if(s.countdown<=0)s.phase='playing';return;}if(s.phase!=='playing')return;s.elapsed+=dt;const sweeps=[];
 for(const p of s.players){for(const key of ['parry','parryCd','parryFlash','dashCd','cast','inv','slow','stun','guard','postureWait'])p[key]=Math.max(0,(p[key]||0)-dt);p.cd=p.cd.map(n=>Math.max(0,n-dt));if(p.hp<=0){p.burst=null;p.parry=0;p.parryQueued=false;p.dashQueued=false;p.attack=null;p.buffered=null;p.stun=0;p.broken=0;p.respawn-=dt;if(p.respawn<=0&&now-p.seen<8000){place(p);p.hp=p.maxHp;p.posture=0;p.inv=1.6;event(s,'respawn',{target:p.id});}continue;}if(p.bot)botThink(s,p,dt);const raw=now-p.seen<2200?p.input:idle(),busy=p.stun>0||!!p.attack,input=busy?{...raw,forward:0,strafe:0,jump:false}:raw,press=p.parryQueued||(raw.parry&&!p.parryHeld);p.parryQueued=false;p.parryHeld=!!raw.parry;if(press&&p.parryCd<=0&&!busy){p.parry=.3;p.parryCd=1.2;}const dash=p.dashQueued||(raw.dash&&!p.dashHeld);p.dashQueued=false;p.dashHeld=!!raw.dash;if(dash&&p.dashCd<=0&&!p.burst&&p.stun<=0&&(!p.attack||p.attack.done)){p.attack=null;dodge(s,p,raw);}combat(s,p,raw,dt);const x=p.x,z=p.z;motion(p,input,dt);p.moving=!!input.forward||!!input.strafe||!!p.burst;if(p.burst)sweeps.push({p,b:p.burst,x,z});}
 for(let i=0;i<s.players.length;i++)for(let j=i+1;j<s.players.length;j++){const a=s.players[i],b=s.players[j];if(a.hp<=0||b.hp<=0||a.burst||b.burst||Math.abs(a.y-b.y)>1.2)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<1.3&&d>1e-4){const push=(1.3-d)/2;move(a,-dx/d*push,-dz/d*push);move(b,dx/d*push,dz/d*push);}}
 for(const {p,b,x,z} of sweeps){if(b.kind==='charge'&&p.hp>0)for(const q of s.players){if(q.id===p.id||q.hp<=0||Math.abs(q.y-p.y)>1.8||b.hits.includes(q.id))continue;if(segmentDistance(q.x,q.z,x,z,p.x,p.z).distance<.8){b.hits.push(q.id);damage(s,q,b.damage,p.id);}}if(b.elapsed>=b.duration)p.burst=null;}
 for(const p of s.players)if(p.hp>0&&now-p.seen<2200&&!p.bot)for(let i=0;i<3;i++)if(p.input.fire[i])fire(s,p,i);
 for(const a of s.shots){a.life-=dt;const x=a.x,y=a.y,z=a.z;a.x+=a.vx*dt;a.y+=a.vy*dt;a.z+=a.vz*dt;
  if(a.y<0||Math.abs(a.x)>12||Math.abs(a.z)>10||PILLARS.some(([px,pz])=>segmentDistance(px,pz,x,z,a.x,a.z).distance<.72)){a.life=0;continue;}
  let target=null,nearest=2;for(const q of s.players){if(q.id===a.owner||q.hp<=0||q.inv>0||now-q.seen>=8000)continue;const hit=segmentDistance(q.x,q.z,x,z,a.x,a.z),hy=y+(a.y-y)*hit.t;if(hit.distance<.55&&hy>q.y+.05&&hy<q.y+1.9&&hit.t<nearest){target=q;nearest=hit.t;}}
  if(target){a.life=0;if(a.kind==='fire'){for(const q of s.players)if(q.id!==a.owner&&Math.hypot(q.x-target.x,q.z-target.z)<2.15&&Math.abs(q.y-target.y)<1.6)damage(s,q,a.damage,a.owner);event(s,'explosion',{x:target.x,y:target.y+.8,z:target.z});}else damage(s,target,a.damage,a.owner,a.kind==='ice'?1.7:0);}
 }s.shots=s.shots.filter(a=>a.life>0);
 for(const b of s.bolts){b.t-=dt;if(b.t<=0){for(const q of s.players)if(q.id!==b.owner&&Math.hypot(q.x-b.x,q.z-b.z)<2.1&&q.y<3.2)damage(s,q,b.damage,b.owner,.8);event(s,'strike',{x:b.x,z:b.z,y:0});}}s.bolts=s.bolts.filter(b=>b.t>0);
 if(s.elapsed>=180&&s.phase==='playing'){const ranks=[...s.players].sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths);s.phase='finished';s.winner=ranks[0]?.kills===ranks[1]?.kills?null:ranks[0]?.id;}
}
export function advance(s,now){for(const p of s.players)if(p.bot)p.seen=now;const active=s.players.filter(p=>now-p.seen<8000);if(!active.some(p=>p.id===s.host&&!p.bot))s.host=active.find(p=>!p.bot)?.id??s.host;if(active.length<2&&s.phase==='playing'){s.last=now;return;}let delta=clamp((now-s.last)/1000,0,.4);s.last=now;while(delta>0){const dt=Math.min(delta,1/60);tick(s,dt,now);delta-=dt;}}
export function snapshot(s,now){return {...s,last:now,players:s.players.map(({hash,input,seq,seen,parryHeld,parryQueued,dashHeld,dashQueued,lightHeld,lightQueued,heavyHeld,heavyQueued,guardbreakHeld,guardbreakQueued,buffered,ai,...p})=>({...p,burst:p.burst?{...p.burst,hits:undefined}:null,connected:!!p.bot||now-seen<8000})),waiting:s.players.filter(p=>p.bot||now-p.seen<8000).length<2};}
