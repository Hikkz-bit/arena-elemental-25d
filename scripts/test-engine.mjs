import assert from 'node:assert/strict';
import {newRoom,newPlayer,reset,advance,snapshot,COMBAT,mirror} from '../worker/engine.mjs';
import {CLASSES} from '../public/catalog.js';
import {motion,PILLARS} from '../public/physics.js';
function fixture(classId='mage'){let now=1000;const s=newRoom('TEST',now);s.players=[newPlayer('a','secret','A',0,now),newPlayer('b','secret2','B',1,now)];const [a,b]=s.players;a.classId=classId;reset(s,now);s.phase='playing';Object.assign(a,{x:0,z:3,yaw:0,pitch:0});Object.assign(b,{x:0,z:1,yaw:Math.PI});return {s,a,b,step(seconds){const end=now+seconds*1000;while(now<end){now=Math.min(end,now+1000/60);s.players.forEach(p=>p.seen=now);advance(s,now);}}};}
for(const id of Object.keys(CLASSES))for(let i=0;i<3;i++){const f=fixture(id);f.a.input={forward:0,strafe:0,yaw:0,pitch:0,fire:[i===0,i===1,i===2]};f.step(1/60);f.a.input.fire.fill(false);f.step(1);const kind=CLASSES[id].abilities[i].kind;if(kind==='dash'){assert(f.a.z<0);assert.equal(f.b.hp,100);}else assert(f.b.hp<100,id+' '+kind+' damage');}
for(const [i,damage] of [28,20,46].entries()){const f=fixture();f.a.input.fire[i]=true;f.step(1/60);f.a.input.fire[i]=false;f.step(1);assert.equal(f.b.hp,100-damage);}
{
 const f=fixture('knight');f.b.input.parry=true;f.a.input.fire[0]=true;f.step(1/60);assert.equal(f.b.hp,100);assert.equal(f.b.parryCd,0);f.b.input.parry=false;f.step(1/60);f.b.input.parry=true;f.step(1/60);assert(f.b.parryCd>1);assert.equal(f.b.hp,100);
 const miss=fixture('mage');miss.b.x=5;miss.a.input.fire[0]=true;miss.step(.01);miss.a.input.fire[0]=false;miss.step(1.5);assert.equal(miss.b.hp,100,'aim matters in depth');
 const vertical=fixture('mage');vertical.a.input.pitch=1;vertical.a.input.fire[0]=true;vertical.step(.01);vertical.a.input.fire[0]=false;vertical.step(1);assert.equal(vertical.b.hp,100,'aiming over the target misses');
 const f2=fixture('rogue');f2.a.input.fire[1]=true;f2.step(.01);const before=f2.a.z;f2.step(.05);assert(f2.a.z<before&&f2.a.z>-1,'dash has intermediate positions');
 assert(!JSON.stringify(snapshot(f.s,2000)).includes('secret'));
}
{
 const p={x:0,z:0,y:0,vy:0,yaw:0,speed:115};motion(p,{forward:1,strafe:0,yaw:Math.PI/2},.1);assert(p.x>0&&Math.abs(p.z)<.001,'yaw controls forward direction');
 Object.assign(p,{x:7,z:0});for(let i=0;i<180;i++)motion(p,{forward:1,strafe:0,yaw:0},1/60);assert(Math.hypot(p.x-7,p.z+4)>=1.09,'pillar collision');
 for(let i=0;i<500;i++)motion(p,{forward:1,strafe:1,yaw:1},1/60);assert(Math.abs(p.x)<=11.5&&Math.abs(p.z)<=9.5,'arena bounds');
 motion(p,{jump:true},.1);assert(p.y>0,'jump');
}
{
 // Universal dash: Shift, edge-triggered, moves along the input direction, brief invulnerability, own cooldown.
 const f=fixture('mage');f.a.input={forward:0,strafe:1,yaw:0,pitch:0,jump:false,parry:false,dash:true,fire:[false,false,false]};f.step(1/60);assert.equal(f.a.burst?.kind,'dodge');assert(f.a.inv>0,'dash grants i-frames');assert(f.a.dashCd>2,'dash cooldown starts');f.step(.23);assert(f.a.x>3.3&&f.a.x<3.6,'dash travels sideways about 3.4 m, got '+f.a.x);assert.equal(f.a.burst,null);const x=f.a.x;f.step(.5);assert(f.a.x>x,'walking continues after the dash');const held=f.a.x;f.step(3);assert(f.a.dashCd===0);assert.equal(f.a.burst,null,'holding the key does not chain dashes');
 const g=fixture('knight');g.b.input={...g.b.input,dash:true};g.a.input.fire[0]=true;g.step(1/60);assert.equal(g.b.hp,100,'dash i-frames avoid a melee hit');
 const h=fixture('rogue');h.a.input={forward:0,strafe:0,yaw:0,pitch:0,jump:false,parry:false,dash:true,fire:[false,false,false]};h.step(.4);assert(h.a.z<3-2.5,'no direction held: dash goes forward');
}
{
 // Duel rules: guard in three directions, light and heavy attacks, block, parry, guard break, stamina.
 const still={forward:0,strafe:0,yaw:0,pitch:0,jump:false,parry:false,dash:false,fire:[false,false,false]},facing={...still,yaw:Math.PI};
 const duel=(aInput,bInput,seconds=1)=>{const f=fixture('knight');f.a.input={...still,...aInput};f.b.input={...facing,...bInput};f.step(1/60);f.a.input={...f.a.input,light:false,heavy:false,guardbreak:false};f.step(seconds);return f;};
 assert.equal(mirror(0),2);assert.equal(mirror(1),1);
 let f=duel({light:true,stance:1},{stance:0});assert.equal(f.b.hp,100-COMBAT.light.damage,'a light attack lands when the guard is elsewhere');assert(f.a.stamina<COMBAT.stamina||f.a.staminaWait===0);
 f=duel({light:true,stance:2},{stance:0});assert.equal(f.b.hp,100,'a matching guard blocks: my right is your left');assert(f.s.events.some(e=>e.type==='block'&&e.target===f.b.id));
 f=duel({light:true,stance:1},{stance:1});assert.equal(f.b.hp,100,'top guard blocks a top attack');
 f=duel({heavy:true,stance:0},{stance:0});assert.equal(f.b.hp,100-COMBAT.heavy.damage,'a heavy attack lands');
 f=duel({heavy:true,stance:0},{stance:2});assert.equal(f.b.hp,100-COMBAT.chip,'a blocked heavy still chips');
 f=duel({heavy:true,stance:0},{stance:1},.3);assert.equal(f.b.hp,100,'the heavy has not landed yet: it has a longer wind-up');assert.equal(f.a.attack?.kind,'heavy');
 {const g=fixture('knight');g.a.input={...still,heavy:true,stance:0};g.b.input={...facing,stance:1};g.step(COMBAT.heavy.windup-.1);g.b.input={...facing,stance:1,parry:true};g.step(.2);assert.equal(g.b.hp,100,'a parry stops the heavy');assert(g.a.stun>0,'and stuns the attacker');assert.equal(g.a.attack,null);}
 f=duel({guardbreak:true},{stance:1},.5);assert(f.b.stun>0,'a guard break stuns a defender who is only guarding');assert.equal(f.b.hp,100);
 {const g=fixture('knight');g.a.input={...still,guardbreak:true};g.b.input={...facing,stance:1};g.step(.5);g.a.input={...still,light:true,stance:1};g.step(1/60);g.a.input={...still,stance:1};g.step(.6);assert.equal(g.b.hp,100-COMBAT.light.damage,'a stunned defender cannot block, even with the right guard');}
 {const g=fixture('knight');g.b.input={...facing,heavy:true,stance:1};g.step(.2);g.a.input={...still,guardbreak:true,stance:0};g.step(.45);assert.equal(g.b.stun,0,'a guard break bounces off someone who is already swinging');assert(g.s.events.some(e=>e.type==='clash'));}
 {const g=fixture('knight');g.b.input={...facing,stance:0};let swings=0;for(let i=0;i<14;i++){g.a.input={...still,light:true,stance:1};g.step(1/60);g.a.input={...still,stance:1};g.step(.62);if(g.s.events.some(e=>e.type==='swing'&&e.id>(g.seen||0)))swings++;g.seen=g.s.eid;}assert(swings<14&&swings>=5,'stamina limits how many attacks come out in a row, got '+swings);g.step(6);assert.equal(g.a.stamina,COMBAT.stamina,'stamina comes back after resting');}
 {const g=fixture('knight');g.a.stun=.5;g.a.input={...still,fire:[true,false,false]};g.step(.2);assert.equal(g.b.hp,100,'a stunned fighter cannot use abilities');}
 {const g=fixture('knight');Object.assign(g.b,{bot:true,aggressive:true,x:0,z:-2});g.a.input={...still,stance:0};g.step(14);assert(g.a.hp<130,'the training rival walks up and lands hits on a fighter who never changes guard');}
 {const g=fixture('knight');g.a.input={...still,forward:1};g.step(2);assert(Math.hypot(g.a.x-g.b.x,g.a.z-g.b.z)>=1.28,'fighters cannot walk into each other');}
 {const g=fixture('knight');g.a.input={...still,forward:1,guard:true};g.step(.5);const guarded=3-g.a.z;const h=fixture('knight');h.a.input={...still,forward:1};h.step(.5);assert(guarded<(3-h.a.z)*.8,'guard mode walks slower than running');}
}
console.log('PASS: duel rules (guard, light, heavy, block, parry, guard break, stamina, rival), universal dash, 12 skills in depth, mage damage, parry reset, aim/pitch misses, smooth dash, rotation, pillars, bounds, jump, private tokens');
