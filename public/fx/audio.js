// All sound is synthesised in the browser: no audio files. Each effect is a few oscillators and
// filtered noise with an envelope; each arena has a looping bed of filtered noise.
const AMBIENCE={abbey:{type:'bandpass',f:380,q:.6,gain:.05,lfo:.07,depth:160},volcano:{type:'lowpass',f:150,q:.8,gain:.16,lfo:.11,depth:50},forest:{type:'bandpass',f:900,q:.5,gain:.035,lfo:.05,depth:300,chirps:true},glacier:{type:'bandpass',f:700,q:.9,gain:.06,lfo:.16,depth:320}};

export function createAudio(){
 let ctx=null,master=null,noiseBuffer=null,enabled=true,bed=null,bedId=null,chirpTimer=null,listener={x:0,z:0,yaw:0};
 function unlock(){
  if(ctx){if(ctx.state==='suspended')ctx.resume();return true;}
  try{ctx=new (window.AudioContext||window.webkitAudioContext)();}catch{return false;}
  master=ctx.createGain();master.gain.value=enabled?.6:0;const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  if(bedId)ambience(bedId);return true;
 }
 function out(pan,volume){const g=ctx.createGain();g.gain.value=volume;if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(master);}else g.connect(master);return g;}
 function envelope(g,t,attack,decay,peak){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);}
 function tone(dest,t,{type='sine',f0,f1=f0,dur=.2,peak=.3,attack=.005}){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);envelope(g,t,attack,dur,peak);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+attack+.05);}
 function noise(dest,t,{type='bandpass',f0,f1=f0,q=1,dur=.2,peak=.3,attack=.005}){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer;s.loop=true;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);envelope(g,t,attack,dur,peak);s.connect(f);f.connect(g);g.connect(dest);s.start(t,Math.random());s.stop(t+dur+attack+.05);}
 const SOUNDS={
  swing:(d,t)=>noise(d,t,{f0:420,f1:1900,q:1.3,dur:.17,peak:.3}),
  heavy:(d,t)=>{noise(d,t,{f0:260,f1:1300,q:1.1,dur:.26,peak:.36});tone(d,t,{f0:120,f1:70,dur:.2,peak:.12});},
  throw:(d,t)=>noise(d,t,{type:'highpass',f0:900,f1:3200,dur:.13,peak:.22}),
  stab:(d,t)=>{noise(d,t,{f0:900,f1:2600,q:2,dur:.1,peak:.26});tone(d,t,{type:'triangle',f0:520,f1:260,dur:.08,peak:.1});},
  hit:(d,t)=>{tone(d,t,{f0:175,f1:55,dur:.14,peak:.5});noise(d,t,{type:'lowpass',f0:1100,f1:300,dur:.07,peak:.34});},
  hurt:(d,t)=>{tone(d,t,{f0:115,f1:42,dur:.24,peak:.6});noise(d,t,{type:'lowpass',f0:700,f1:180,dur:.14,peak:.4});},
  block:(d,t)=>{for(const [f,p] of [[620,.2],[930,.12],[1480,.07]])tone(d,t,{type:'triangle',f0:f,f1:f*.97,dur:.16,peak:p,attack:.002});noise(d,t,{type:'bandpass',f0:1800,q:2,dur:.06,peak:.3});},
  guardbreak:(d,t)=>{tone(d,t,{f0:210,f1:60,dur:.2,peak:.5});noise(d,t,{type:'lowpass',f0:1600,f1:300,dur:.12,peak:.4});tone(d,t+.03,{type:'square',f0:330,f1:120,dur:.12,peak:.08});},
  parry:(d,t)=>{for(const [f,p] of [[1180,.22],[1760,.18],[2640,.13],[3340,.09]])tone(d,t,{type:'triangle',f0:f,f1:f*.985,dur:.4,peak:p,attack:.002});noise(d,t,{type:'highpass',f0:3500,dur:.05,peak:.3});},
  fire:(d,t)=>{noise(d,t,{type:'lowpass',f0:320,f1:1500,dur:.34,peak:.36});tone(d,t,{type:'sawtooth',f0:190,f1:85,dur:.3,peak:.09});},
  ice:(d,t)=>{tone(d,t,{f0:1900,f1:2700,dur:.24,peak:.12});tone(d,t,{f0:2450,f1:3200,dur:.2,peak:.09});noise(d,t,{type:'highpass',f0:4200,dur:.16,peak:.14});},
  bolt:(d,t)=>{tone(d,t,{type:'square',f0:95,f1:60,dur:.22,peak:.12});noise(d,t,{f0:2400,f1:900,q:3,dur:.2,peak:.16});},
  light:(d,t)=>{tone(d,t,{f0:880,f1:1760,dur:.22,peak:.16});tone(d,t,{type:'triangle',f0:1320,f1:2640,dur:.18,peak:.1});},
  strike:(d,t)=>{noise(d,t,{type:'lowpass',f0:2800,f1:160,dur:.5,peak:.7,attack:.002});tone(d,t,{f0:70,f1:32,dur:.45,peak:.6});},
  explosion:(d,t)=>{noise(d,t,{type:'lowpass',f0:1300,f1:110,dur:.5,peak:.6,attack:.003});tone(d,t,{f0:95,f1:34,dur:.4,peak:.5});},
  quake:(d,t)=>{tone(d,t,{f0:72,f1:28,dur:.55,peak:.75});noise(d,t,{type:'lowpass',f0:340,f1:90,dur:.45,peak:.5});},
  dash:(d,t)=>noise(d,t,{f0:600,f1:2500,q:.9,dur:.16,peak:.26}),
  ko:(d,t)=>{tone(d,t,{f0:230,f1:58,dur:.55,peak:.45});noise(d,t,{type:'lowpass',f0:900,f1:140,dur:.4,peak:.3});},
  rise:(d,t)=>{tone(d,t,{type:'triangle',f0:440,f1:660,dur:.14,peak:.16});tone(d,t+.12,{type:'triangle',f0:660,f1:990,dur:.2,peak:.16});},
  ui:(d,t)=>tone(d,t,{type:'triangle',f0:660,f1:700,dur:.06,peak:.12}),
  lock:(d,t)=>{tone(d,t,{type:'square',f0:980,dur:.04,peak:.06});tone(d,t+.05,{type:'square',f0:1470,dur:.05,peak:.06});},
  step:(d,t)=>noise(d,t,{type:'lowpass',f0:520,f1:200,dur:.05,peak:.11})
 };
 function play(name,at){
  if(!enabled||!ctx||ctx.state!=='running'||!SOUNDS[name])return;let pan=0,volume=1;
  if(at){const dx=at.x-listener.x,dz=at.z-listener.z,dist=Math.hypot(dx,dz);volume=1/(1+dist*.13);pan=dist>.3?(dx*Math.cos(listener.yaw)+dz*Math.sin(listener.yaw))/dist*.8:0;}
  SOUNDS[name](out(pan,volume),ctx.currentTime+.005);
 }
 function ambience(id){
  bedId=id;if(!ctx)return;if(bed){bed.gain.gain.setTargetAtTime(0,ctx.currentTime,.3);const old=bed;setTimeout(()=>{old.source.stop();old.lfo.stop();},1200);bed=null;}clearInterval(chirpTimer);
  const a=AMBIENCE[id];if(!a)return;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();
  source.buffer=noiseBuffer;source.loop=true;filter.type=a.type;filter.frequency.value=a.f;filter.Q.value=a.q;gain.gain.value=0;gain.gain.setTargetAtTime(a.gain,ctx.currentTime,.8);lfo.frequency.value=a.lfo;depth.gain.value=a.depth;lfo.connect(depth);depth.connect(filter.frequency);
  source.connect(filter);filter.connect(gain);gain.connect(master);source.start();lfo.start();bed={source,gain,lfo};
  if(a.chirps)chirpTimer=setInterval(()=>{if(!enabled||ctx.state!=='running'||Math.random()<.5)return;const d=out(Math.random()*1.6-.8,.5),t=ctx.currentTime,f=2300+Math.random()*1200;tone(d,t,{f0:f,f1:f*1.15,dur:.07,peak:.04});tone(d,t+.11,{f0:f*1.1,f1:f*1.25,dur:.06,peak:.035});},1700);
 }
 return {unlock,play,ambience,
  get enabled(){return enabled;},
  setEnabled(v){enabled=v;if(master)master.gain.setTargetAtTime(v?.6:0,ctx.currentTime,.05);},
  setListener(x,z,yaw){listener={x,z,yaw};}};
}
