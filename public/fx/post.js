import * as T from '../vendor/three.js';
import {EffectComposer} from '../vendor/post/EffectComposer.js';
import {RenderPass} from '../vendor/post/RenderPass.js';
import {ShaderPass} from '../vendor/post/ShaderPass.js';
import {UnrealBloomPass} from '../vendor/post/UnrealBloomPass.js';
import {OutputPass} from '../vendor/post/OutputPass.js';

// Image pipeline: the scene renders to an HDR target, bright parts bloom, a grade adds vignette,
// saturation and a brief colour split on impacts, and the output pass applies tone mapping.
// If the machine cannot hold 30 frames per second with it on, it switches itself off.
const GRADE={
 uniforms:{tDiffuse:{value:null},uVignette:{value:.42},uSaturation:{value:1.1},uPulse:{value:0},uTint:{value:new T.Color(1,1,1)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uVignette,uSaturation,uPulse;uniform vec3 uTint;varying vec2 vUv;
void main(){vec2 c=vUv-0.5;float r2=dot(c,c);vec2 split=c*uPulse*0.014;
 vec3 col=vec3(texture2D(tDiffuse,vUv+split).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-split).b);
 float l=dot(col,vec3(0.2126,0.7152,0.0722));col=mix(vec3(l),col,uSaturation)*uTint;
 col*=1.0-uVignette*smoothstep(0.1,0.62,r2);gl_FragColor=vec4(col,1.0);}`
};

export function createPost(renderer,scene,camera){
 let composer=null,grade=null,enabled=true,forced=false,slow=0,pulse=0;
 function build(){
  const size=renderer.getDrawingBufferSize(new T.Vector2());
  composer=new EffectComposer(renderer,new T.WebGLRenderTarget(size.x,size.y,{type:T.HalfFloatType,samples:4}));
  composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new T.Vector2(size.x/2,size.y/2),.55,.65,1.15));
  grade=new ShaderPass(GRADE);composer.addPass(grade);composer.addPass(new OutputPass());
 }
 try{build();}catch{enabled=false;}
 return {
  get enabled(){return enabled;},
  // Returns the new state so the caller can update its label.
  toggle(){forced=true;enabled=!enabled&&!!composer;return enabled;},
  pulse(amount){pulse=Math.max(pulse,amount);},
  setSize(w,h){composer?.setSize(w,h);},
  render(dt){
   pulse=Math.max(0,pulse-dt*3.2);
   if(!enabled||!composer){renderer.render(scene,camera);return;}
   // Sustained slow frames (not a single hitch) turn the effects off unless the player chose them.
   if(!forced){slow=dt>1/28?slow+dt:Math.max(0,slow-dt*2);if(slow>4){enabled=false;renderer.render(scene,camera);return;}}
   grade.uniforms.uPulse.value=pulse;composer.render(dt);
  }
 };
}
