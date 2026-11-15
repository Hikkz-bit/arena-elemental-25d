import assert from 'node:assert/strict';
import {newRoom,newPlayer,reset,advance,snapshot,COMBAT,mirror,teamOf,TEAM_GOAL} from '../worker/engine.mjs';
import {CLASSES,bodyOf} from '../public/catalog.js';
import {motion,PILLARS,BOUNDS} from '../public/physics.js';
function fixture(classId='mage'){let now=1000;const s=newRoom('TEST',now);s.players=[newPlayer('a','secret','A',0,now),newPlayer('b','secret2','B',1,now)];const [a,b]=s.players;a.classId=classId;reset(s,now);s.phase='playing';Object.assign(a,{x:0,z:3,yaw:0,pitch:0});Object.assign(b,{x:0,z:1,yaw:Math.PI});return {s,a,b,step(seconds){const end=now+seconds*1000;while(now<end){now=Math.min(end,now+1000/60);s.players.forEach(p=>p.seen=now);advance(s,now);}}};}
// Every ability of every class does what it says: damage, a dash without damage, or a heal.
for(const id of Object.keys(CLASSES))for(let i=0;i<3;i++){const f=fixture(id),kind=CLASSES[id].abilities[i].kind;if(kind==='bloom')f.a.hp=50;f.a.input={forward:0,strafe:0,yaw:0,pitch:0,fire:[i===0,i===1,i===2]};f.step(1/60);f.a.input.fire.fill(false);f.step(1);if(kind==='dash'){assert(f.a.z<0);assert.equal(f.b.hp,100);}else if(kind==='bloom'){assert.equal(f.a.hp,50+CLASSES[id].abilities[i].heal,'bloom heals the caster');assert.equal(f.b.hp,100,'and not a rival');}else assert(f.b.hp<100,id+' '+kind+' damage');}
for(const [i,a] of CLASSES.mage.abilities.entries()){const f=fixture();f.a.input.fire[i]=true;f.step(1/60);f.a.input.fire[i]=false;f.step(1);assert.equal(f.b.hp,100-a.damage);}
assert(CLASSES.mage.abilities[2].damage<=38&&CLASSES.knight.abilities[2].damage<=39,'the mage and the knight were toned down');
assert.equal(bodyOf('druid','male'),'female');assert.equal(bodyOf('archer','male'),'male');assert.equal(bodyOf('archer','female'),'female');
{
 // The parry also turns away an ability that arrives inside its window, and it has no cooldown.
 const f=fixture('knight');f.b.input.parry=true;f.a.input.fire[0]=true;f.step(1/60);assert.equal(f.b.hp,100,'a parry pressed as the ability lands stops it');assert(f.s.events.some(e=>e.type==='parry'&&e.target===f.b.id));assert(f.a.posture>0,'and strains the caster');assert.equal(f.b.posture,0);
 const miss=fixture('mage');miss.b.x=5;miss.a.input.fire[0]=true;miss.step(.01);miss.a.input.fire[0]=false;miss.step(1.5);assert.equal(miss.b.hp,100,'aim matters in depth');
 const vertical=fixture('mage');vertical.a.input.pitch=1;vertical.a.input.fire[0]=true;vertical.step(.01);vertical.a.input.fire[0]=false;vertical.step(1);assert.equal(vertical.b.hp,100,'aiming over the target misses');
 const f2=fixture('rogue');f2.a.input.fire[1]=true;f2.step(.01);const before=f2.a.z;f2.step(.05);assert(f2.a.z<before&&f2.a.z>-1,'dash has intermediate positions');
 assert(!JSON.stringify(snapshot(f.s,2000)).includes('secret'));
}
{
 const p={x:0,z:0,y:0,vy:0,yaw:0,speed:115};motion(p,{forward:1,strafe:0,yaw:Math.PI/2},.1);assert(p.x>0&&Math.abs(p.z)<.001,'yaw controls forward direction');
 const [px,pz]=PILLARS[1];Object.assign(p,{x:px,z:0});for(let i=0;i<240;i++)motion(p,{forward:1,strafe:0,yaw:0},1/60);assert(Math.hypot(p.x-px,p.z-pz)>=1.09,'pillar collision');
 for(let i=0;i<700;i++)motion(p,{forward:1,strafe:1,yaw:1},1/60);assert(Math.abs(p.x)<=BOUNDS.x&&Math.abs(p.z)<=BOUNDS.z,'arena bounds');assert(BOUNDS.x>=14&&BOUNDS.z>=12,'the arena was enlarged');
 motion(p,{jump:true},.1);assert(p.y>0,'jump');
}
{
 // Universal dash: Shift, edge-triggered, moves along the input direction, brief invulnerability, own cooldown.
 const f=fixture('mage');f.a.input={forward:0,strafe:1,yaw:0,pitch:0,jump:false,parry:false,dash:true,fire:[false,false,false]};f.step(1/60);assert.equal(f.a.burst?.kind,'dodge');assert(f.a.inv>0,'dash grants i-frames');assert(f.a.dashCd>.5,'dash cooldown starts');f.step(.21);assert(f.a.x>2.7&&f.a.x<3,'dash travels sideways about 2.8 m, got '+f.a.x);assert.equal(f.a.burst,null);const x=f.a.x;f.step(.5);assert(f.a.x>x,'walking continues after the dash');f.step(3);assert(f.a.dashCd===0);assert.equal(f.a.burst,null,'holding the key does not chain dashes');
 const g=fixture('knight');g.b.input={...g.b.input,dash:true};g.a.input.fire[0]=true;g.step(1/60);assert.equal(g.b.hp,100,'dash i-frames avoid a melee hit');
 const h=fixture('rogue');h.a.input={forward:0,strafe:0,yaw:0,pitch:0,jump:false,parry:false,dash:true,fire:[false,false,false]};h.step(.4);assert(h.a.z<3-2.5,'no direction held: dash goes forward');
}
{
 // Duel rules: light and heavy attacks, and a parry that works on posture. Holding it blocks, pressing it in time deflects,
 // pressing it for nothing costs posture.
 const still={forward:0,strafe:0,yaw:0,pitch:0,jump:false,parry:false,dash:false,fire:[false,false,false]},facing={...still,yaw:Math.PI};
 const duel=(aInput,bInput,seconds=1)=>{const f=fixture('knight');f.b.input={...facing,...bInput};f.a.input={...still,stance:aInput.stance??1};f.step(.5);f.a.input={...still,...aInput};f.step(1/60);f.a.input={...f.a.input,light:false,heavy:false,guardbreak:false};f.step(seconds);return f;};
 const has=(f,type,target)=>f.s.events.some(e=>e.type===type&&(!target||e.target===target.id));
 assert.equal(mirror(0),2);assert.equal(mirror(1),1);
 let f=duel({light:true},{});assert.equal(f.b.hp,100-COMBAT.light.damage,'a light attack lands on a fighter who is not guarding');assert(f.b.posture>0,'taking a hit also strains posture');
 for(const stance of [0,1,2]){f=duel({light:true,stance},{parry:true,stance:1});assert.equal(f.b.hp,100,'a held guard blocks a blow from any side');assert(has(f,'block',f.b));assert(!has(f,'deflect'),'a guard held for a while is a plain block');assert(f.b.posture>=COMBAT.light.posture,'blocking fills the blocker posture');}
 f=duel({heavy:true},{});assert.equal(f.b.hp,100-COMBAT.heavy.damage,'a heavy attack lands');
 f=duel({heavy:true},{parry:true});assert.equal(f.b.hp,100-COMBAT.chip,'a blocked heavy still chips');
 f=duel({heavy:true},{},.3);assert.equal(f.b.hp,100,'the heavy has not landed yet: it has a longer wind-up');assert.equal(f.a.attack?.kind,'heavy');
 {const g=fixture('knight');g.b.posture=40;g.b.postureWait=9;g.a.input={...still,heavy:true};g.b.input={...facing};g.step(COMBAT.heavy.windup-.1);g.b.input={...facing,parry:true};g.step(.2);assert.equal(g.b.hp,100,'a parry pressed just before the blow deflects it');assert(has(g,'deflect',g.b));assert.equal(g.b.posture,40-COMBAT.deflectHeal,'a deflection lowers the defender posture');assert(g.a.posture>=COMBAT.heavy.posture,'and raises the attacker posture');g.step(.5);assert.equal(g.b.posture,40-COMBAT.deflectHeal,'a deflection is not also counted as a miss');}
 {const g=fixture('knight');g.b.input={...facing,parry:true};g.step(.1);assert.equal(g.b.posture,0,'the window is still open');g.step(.2);assert.equal(g.b.posture,COMBAT.whiff,'a parry that deflects nothing raises the presser posture');g.b.input={...facing};g.step(1/60);g.b.input={...facing,parry:true};g.step(1/60);assert(g.b.parry>0,'the parry has no cooldown');
  let presses=1;while(!has(g,'break',g.b)&&presses<40){g.b.input={...facing};g.step(.03);g.b.input={...facing,parry:true};g.step(.25);presses++;}assert(has(g,'break',g.b),'missing parry after parry breaks your own posture');assert(g.b.broken>0&&g.b.stun>0);assert(presses>=8,'it takes a streak of misses, got '+presses);}
 {const g=fixture('knight');g.b.input={...facing,parry:true};g.step(.5);g.b.input={...facing};g.step(.05);g.a.input={...still,light:true};g.step(COMBAT.light.windup-.08);g.b.input={...facing,parry:true};g.step(.2);assert(has(g,'deflect',g.b),'after a miss the next well-timed press still deflects');assert.equal(g.b.hp,100);}
 f=duel({guardbreak:true},{parry:true},.5);assert(f.b.stun>0,'a guard break stuns a defender who is only guarding');assert.equal(f.b.hp,100);
 {const g=fixture('knight');g.a.input={...still,guardbreak:true};g.b.input={...facing,parry:true};g.step(.5);g.a.input={...still,light:true};g.step(1/60);g.a.input={...still};g.step(.5);assert.equal(g.b.hp,100-COMBAT.light.damage,'a stunned defender cannot block');}
 {const g=fixture('knight');g.b.input={...facing,heavy:true};g.step(.1);g.a.input={...still,guardbreak:true};g.step(.35);assert.equal(g.b.stun,0,'a guard break bounces off someone who is already swinging');assert(has(g,'clash'));}
 {const g=fixture('knight');g.b.input={...facing};g.a.input={...still,light:true};g.step(1/60);g.a.input={...still};g.step(COMBAT.light.windup+.05);g.a.input={...still,light:true};g.step(1/60);g.a.input={...still};g.step(.6);assert.equal(g.b.hp,100-2*COMBAT.light.damage,'a second light pressed during the recovery comes out as a string');assert.equal(g.s.events.filter(e=>e.type==='swing').length,2);}
 {const g=fixture('knight');g.b.maxHp=g.b.hp=400;g.b.input={...facing,parry:true};let broke=false;for(let i=0;i<6&&!broke;i++){g.a.input={...still,heavy:true};g.step(1/60);g.a.input={...still};g.step(.95);broke=has(g,'break',g.b);}assert(broke,'blocking heavy after heavy fills posture until the guard collapses');assert(g.b.stun>0&&g.b.broken>0);const before=g.b.hp;g.a.input={...still,light:true};g.step(1/60);g.a.input={...still};g.step(.4);assert(has(g,'deathblow'),'the next blow on a collapsed fighter is a deathblow');assert.equal(g.b.hp,before-COMBAT.light.damage*COMBAT.deathblow);g.b.input={...facing};g.step(9);assert.equal(g.b.posture,0,'posture recovers with rest');}
 {const g=fixture('knight');g.b.yaw=0;g.b.input={...still,parry:true};g.step(.5);g.a.input={...still,light:true};g.step(1/60);g.a.input={...still};g.step(.5);assert.equal(g.b.hp,100-COMBAT.light.damage,'a guard does not cover the back');}
 {const g=fixture('knight');g.a.stun=.5;g.a.input={...still,fire:[true,false,false]};g.step(.2);assert.equal(g.b.hp,100,'a stunned fighter cannot use abilities');}
 {const g=fixture('knight');Object.assign(g.b,{bot:true,aggressive:true,x:0,z:-2});g.a.input={...still};g.step(14);assert(g.a.hp<130||g.a.deaths>0,'the training rival walks up and lands hits on a fighter who never guards');}
 {const g=fixture('knight');Object.assign(g.b,{bot:true,aggressive:false,maxHp:999,hp:999});let blocked=0,deflected=0;for(let i=0;i<30;i++){g.a.input={...still,light:true};g.step(1/60);g.a.input={...still};g.step(.7);}blocked=g.s.eid;assert(g.b.hp>999-30*COMBAT.light.damage*.5,'the training target defends most blows (block or deflection)');}
 {const g=fixture('knight');g.a.input={...still,forward:1};g.step(2);assert(Math.hypot(g.a.x-g.b.x,g.a.z-g.b.z)>=1.28,'fighters cannot walk into each other');}
 {const g=fixture('knight');g.a.input={...still,forward:1,guard:true};g.step(.5);const guarded=3-g.a.z;const h=fixture('knight');h.a.input={...still,forward:1};h.step(.5);assert(guarded<(3-h.a.z)*.8,'guard mode walks slower than running');}
}
{
 // New classes. The archer's volley is three arrows; the piercing shot goes through the first rival and hits the one behind.
 const still={forward:0,strafe:0,yaw:0,pitch:0,jump:false,parry:false,dash:false,fire:[false,false,false]};
 const f=fixture('archer');f.a.input={...still,fire:[false,true,false]};f.step(1/60);assert.equal(f.s.shots.length,3,'the volley fires three arrows');assert.equal(new Set(f.s.shots.map(a=>a.id)).size,3,'each with its own id');
 const g=fixture('archer');const c=newPlayer('c','s3','C',2,1000);Object.assign(c,{hp:100,maxHp:100,x:0,z:-2,yaw:Math.PI});g.s.players.push(c);g.a.input={...still,fire:[false,false,true]};g.step(1/60);g.a.input={...still};g.step(.6);assert.equal(g.b.hp,100-CLASSES.archer.abilities[2].damage,'the piercing shot hits the first rival');assert.equal(c.hp,100-CLASSES.archer.abilities[2].damage,'and the one behind');
 const r=fixture('druid');r.a.input={...still,fire:[false,true,false]};r.step(1/60);r.a.input={...still};r.step(.7);assert.equal(r.b.hp,100-CLASSES.druid.abilities[1].damage);assert(r.b.slow>1,'roots hold the rival for a while');
}
{
 // 2v2: even slots against odd slots. Allies cannot hurt each other, a heal reaches allies, the score is the team's.
 const still={forward:0,strafe:0,yaw:0,pitch:0,jump:false,parry:false,dash:false,fire:[false,false,false]};
 let now=1000;const s=newRoom('TEAM',now);s.mode='teams';s.players=[0,1,2,3].map(i=>newPlayer('p'+i,'h'+i,'P'+i,i,now));const [a,b,c,d]=s.players;a.classId='knight';c.classId='druid';reset(s,now);s.phase='playing';
 const step=seconds=>{const end=now+seconds*1000;while(now<end){now=Math.min(end,now+1000/60);s.players.forEach(p=>p.seen=now);advance(s,now);}};
 assert.equal(s.goal,TEAM_GOAL);assert.equal(teamOf(a),teamOf(c));assert.notEqual(teamOf(a),teamOf(b));assert(Math.sign(a.z)===Math.sign(c.z)&&Math.sign(a.z)!==Math.sign(b.z),'each team starts at its own end');
 Object.assign(a,{x:0,z:3,yaw:0});Object.assign(c,{x:0,z:1.6,yaw:Math.PI,hp:60});Object.assign(b,{x:0,z:.2,yaw:Math.PI});Object.assign(d,{x:9,z:-9});
 a.input={...still,light:true};step(1/60);a.input={...still};step(.6);assert.equal(c.hp,60,'a blow goes through an ally without hurting');assert(b.hp<100,'and hits the rival behind');
 a.input={...still,fire:[true,false,false]};step(1/60);a.input={...still};step(.5);assert.equal(c.hp,60,'abilities do not hurt allies either');
 a.hp=50;c.input={...still,yaw:Math.PI,fire:[false,false,true]};step(1/60);c.input={...still,yaw:Math.PI};step(.2);assert(c.hp===90&&a.hp===50+Math.round(CLASSES.druid.abilities[2].heal*.7),'bloom heals the druid and the ally nearby');assert(b.hp<100,'but not the rival');
 a.kills=TEAM_GOAL-1;b.hp=1;a.input={...still,light:true};step(1/60);a.input={...still};step(.5);assert.equal(s.phase,'finished');assert.equal(s.winner,'team'+teamOf(a),'the team that reaches the goal wins');
}
console.log('PASS: posture parry (block, deflection, miss, break, no cooldown), light/heavy/strings/guard break/deathblow, rivals, 2v2 teams, archer and druid, universal dash, 18 skills in depth, bigger arena, aim/pitch misses, pillars, bounds, jump, private tokens');
