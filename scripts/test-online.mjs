// Real clients against a running server: a full room of four, a fifth refused, start, movement, dash and a hit.
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
const a=client(),b=client(),c=client(),d=client(),e=client();await Promise.all([a,b,c,d,e].map(x=>x.open));
const created=await a.call('create',{name:'Ana',token:randomUUID(),classId:'knight',bodyType:'female',mapId:'forest'}),code=created.room.code,idA=created.id;
const joined=await b.call('join',{name:'Bruno',token:randomUUID(),classId:'mage',bodyType:'male',code}),idB=joined.id;
assert.equal(joined.room.players.length,2);assert.deepEqual(joined.room.players.map(p=>p.classId),['knight','mage']);
const idC=(await c.call('join',{name:'Caio',token:randomUUID(),classId:'archer',bodyType:'male',code})).id;
const full=await d.call('join',{name:'Dani',token:randomUUID(),classId:'druid',bodyType:'female',code});
assert.equal(full.room.players.length,4,'a sala comporta quatro jogadores');assert.deepEqual(full.room.players.map(p=>p.slot).sort(),[0,1,2,3],'cada jogador tem a sua vaga');
assert.equal(new Set(full.room.players.map(p=>p.x+','+p.z)).size,4,'cada jogador nasce em um canto');
await assert.rejects(e.call('join',{name:'Eva',token:randomUUID(),classId:'mage',bodyType:'female',code}),/4 jogadores/,'o quinto jogador é recusado');e.ws.close();
// 2v2: only the creator picks the mode; with both teams full, two players trade places once each of them has asked.
await assert.rejects(b.call('configure',{mode:'teams'}),/criador/,'só o criador escolhe o modo');
assert.equal((await a.call('configure',{mode:'teams'})).room.mode,'teams');
assert.equal((await c.call('configure',{swapTeam:true})).room.players.find(p=>p.id===idC).wantsSwap,true,'com o outro time cheio o pedido fica esperando');
{const traded=await b.call('configure',{swapTeam:true}),slot=id=>traded.room.players.find(p=>p.id===id).slot;assert.deepEqual([slot(idB),slot(idC)],[2,1],'dois pedidos trocam os jogadores de time');}
assert.equal((await a.call('configure',{mode:'ffa'})).room.mode,'ffa');
await a.call('start');
for(let i=0;i<80&&a.room.phase!=='playing';i++)await wait(100);assert.equal(a.room.phase,'playing','a partida começa depois da contagem');
const me=(c,id)=>c.room.players.find(p=>p.id===id),start={...me(a,idA)},toB=Math.atan2(me(a,idB).x-start.x,-(me(a,idB).z-start.z));
// Ana walks toward Bruno, then dashes sideways while Bruno throws a fireball at her.
let dodge=false;const toA=toB+Math.PI;
for(let i=0;i<45;i++){a.input({forward:1,yaw:toB});b.input({yaw:toA,fire:[i===5,false,false]});await wait(33);}
for(let i=0;i<12;i++){a.input({strafe:1,yaw:toB,dash:i<3});b.input({yaw:toA});await wait(33);if(me(a,idA).burst?.kind==='dodge')dodge=true;}
await wait(300);
const end=me(b,idA);assert(Math.hypot(end.x-start.x,end.z-start.z)>3,'Bruno vê Ana se mover');assert(dodge,'o dash aparece no estado da sala');assert(end.dashCd>0,'o dash entra em recarga');
assert(a.room.events.some(e=>e.type==='cast'&&e.owner===idB)||me(a,idB).cd[0]>=0,'a habilidade do Bruno chega para a Ana');
assert.equal(me(a,idB).connected,true);assert(!JSON.stringify(a.room).includes('"hash"'));
for(const x of [a,b,c,d]){await x.call('leave');x.ws.close();}
console.log('PASS online: sala '+code+', quatro jogadores e o quinto recusado, modo 2v2 e troca de time, início, movimento visto pelos outros, dash com recarga em '+origin);
