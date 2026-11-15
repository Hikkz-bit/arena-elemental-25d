import * as T from '../vendor/three.js';

// Character shading. The textures are already painted with their own light and detail, so the shader keeps
// them almost as they are: a soft two-tone falloff from one key direction, a faint rim, and a thin outline.
// It ignores the arena lights on purpose (they are strong and coloured, and washed the faces out);
// each arena only sets the key direction and a light tint so the character still sits in the scene.
const shared={uSun:{value:new T.Vector3(-.4,.8,.45).normalize()},uAmbient:{value:new T.Color(1.06,1.06,1.08)},uShade:{value:new T.Color(.66,.68,.8)}};
export function setCharacterLight(direction,tint){shared.uSun.value.set(...direction).normalize();if(tint)shared.uAmbient.value.set(...tint);}

export function toonMaterial(map,color=0xffffff){
 const uniforms={uHit:{value:0},uGhost:{value:0},uRim:{value:new T.Color(0xd6e4ff)},...shared};
 const m=new T.MeshToonMaterial({map,color});
 m.userData.uniforms=uniforms;
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uHit;uniform float uGhost;uniform vec3 uRim,uSun,uAmbient,uShade;').replace('#include <opaque_fragment>',
   `vec3 sunView=normalize((viewMatrix*vec4(uSun,0.0)).xyz);float lit=smoothstep(-0.12,0.32,dot(normal,sunView));
   float rim=pow(1.0-saturate(dot(normalize(vViewPosition),normal)),3.0);
   outgoingLight=diffuseColor.rgb*mix(uShade,vec3(1.0),lit)*uAmbient+uRim*rim*0.14*lit;
   outgoingLight=mix(outgoingLight,vec3(.05,.32,.3)+uRim*rim,uGhost*.85);outgoingLight=mix(outgoingLight,vec3(1.,.32,.24),uHit*.55);
   #include <opaque_fragment>`);
 };
 m.customProgramCacheKey=()=>'arena-painted';
 return m;
}

// Inverted hull. `thickness` is set every frame from the camera distance so the line keeps about the same width on screen.
export function outlineMaterial(thickness=.006){
 const uniforms={uOutline:{value:thickness}};
 const m=new T.MeshBasicMaterial({color:0x1b1622,side:T.BackSide});
 m.userData.uniforms=uniforms;
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uOutline;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normalize(normal)*uOutline;');
 };
 m.customProgramCacheKey=()=>'arena-outline';
 return m;
}
