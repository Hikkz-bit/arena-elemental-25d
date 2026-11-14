import * as T from '../vendor/three.js';

// Anime-style shading: light falls in three flat bands, a rim catches the silhouette, and a dark hull draws the outline.
let ramp;
function bands(){
 if(!ramp){ramp=new T.DataTexture(new Uint8Array([118,118,118,255,196,196,196,255,255,255,255,255]),3,1,T.RGBAFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;}
 return ramp;
}

export function toonMaterial(map){
 const uniforms={uHit:{value:0},uGhost:{value:0},uRim:{value:new T.Color(0xbfd9ff)}};
 const m=new T.MeshToonMaterial({map,gradientMap:bands(),emissive:0xffffff,emissiveMap:map,emissiveIntensity:.16});
 m.userData.uniforms=uniforms;
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uHit;uniform float uGhost;uniform vec3 uRim;').replace('#include <opaque_fragment>',
   'float rim=pow(1.-saturate(dot(normalize(vViewPosition),normal)),3.2);outgoingLight+=uRim*rim*.38;outgoingLight=mix(outgoingLight,vec3(.05,.32,.3)+uRim*rim,uGhost*.85);outgoingLight=mix(outgoingLight,vec3(1.,.32,.24),uHit*.55);\n#include <opaque_fragment>');
 };
 m.customProgramCacheKey=()=>'arena-toon';
 return m;
}

export function outlineMaterial(thickness=.011){
 const uniforms={uOutline:{value:thickness}};
 const m=new T.MeshBasicMaterial({color:0x0a0d16,side:T.BackSide});
 m.userData.uniforms=uniforms;
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uOutline;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normalize(normal)*uOutline;');
 };
 m.customProgramCacheKey=()=>'arena-outline';
 return m;
}
