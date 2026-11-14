import assert from 'node:assert/strict';
import {newRoom,newPlayer,reset,advance,snapshot} from '../worker/engine.mjs';
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
console.log('PASS: universal dash, 9 skills in depth, mage damage, parry reset, aim/pitch misses, smooth dash, rotation, pillars, bounds, jump, private tokens');
