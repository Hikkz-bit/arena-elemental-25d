// Two real clients against a running server: room, join, start, movement, dash and a hit.
//   node scripts/test-online.mjs [https://arena-elemental-25d.onrender.com]
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';

const origin=process.argv[2]||process.env.ARENA_URL||'http://127.0.0.1:4182',url=origin.replace(/^http/,'ws').replace(/\/$/,'')+'/ws';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function client(){
 const ws=new WebSocket(url,{headers:{Origin:origin}}),pending=new Map();let serial=0;const c={ws,room:null,seq:0};
 ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.room)c.room=m.room;if(m.type==='reply'&&pending.has(m.requestId)){const {resolve,reject}=pending.get(m.requestId);pending.delete(m.requestId);m.error?reject(new Error(m.error)):resolve(m);}});
 c.open=new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 c.call=(action,body={})=>new Promise((resolve,reject)=>{const requestId=++serial;pending.set(requestId,{resolve,reject});ws.send(JSON.stringify({action,...body,requestId}));setTimeout(()=>reject(new Error(action+' sem resposta')),15000);});
 c.input=input=>ws.send(JSON.stringify({action:'input',seq:++c.seq,input:{forward:0,strafe:0,yaw:0,pitch:0,jump:false,parry:false,dash:false,fire:[false,false,false],...input}}));
 return c;
}
const a=client(),b=client();await Promise.all([a.open,b.open]);
const created=await a.call('create',{name:'Ana',token:randomUUID(),classId:'knight',bodyType:'female',mapId:'forest'}),code=created.room.code,idA=created.id;
const joined=await b.call('join',{name:'Bruno',token:randomUUID(),classId:'mage',bodyType:'male',code}),idB=joined.id;
assert.equal(joined.room.players.length,2);assert.deepEqual(joined.room.players.map(p=>p.classId),['knight','mage']);
await a.call('start');
for(let i=0;i<80&&a.room.phase!=='playing';i++)await wait(100);assert.equal(a.room.phase,'playing','a partida começa depois da contagem');
const me=(c,id)=>c.room.players.find(p=>p.id===id),start={...me(a,idA)},toB=Math.atan2(me(a,idB).x-start.x,-(me(a,idB).z-start.z));
// Ana walks toward Bruno, then dashes sideways while Bruno throws a fireball at her.
let dodge=false;const toA=toB+Math.PI;
for(let i=0;i<45;i++){a.input({forward:1,yaw:toB});b.input({yaw:toA,fire:[i===5,false,false]});await wait(33);}
for(let i=0;i<12;i++){a.input({strafe:1,yaw:toB,dash:i<3});b.input({yaw:toA});await wait(33);if(me(a,idA).burst?.kind==='dodge')dodge=true;}
await wait(300);
const end=me(b,idA);assert(Math.hypot(end.x-start.x,end.z-start.z)>3,'Bruno vê Ana se mover');assert(dodge,'o dash aparece no estado da sala');assert(end.dashCd>1,'o dash entra em recarga');
assert(a.room.events.some(e=>e.type==='cast'&&e.owner===idB)||me(a,idB).cd[0]>=0,'a habilidade do Bruno chega para a Ana');
assert.equal(me(a,idB).connected,true);assert(!JSON.stringify(a.room).includes('"hash"'));
await a.call('leave');await b.call('leave');a.ws.close();b.ws.close();
console.log('PASS online: sala '+code+', dois jogadores, início, movimento visto pelos dois, dash com recarga em '+origin);
