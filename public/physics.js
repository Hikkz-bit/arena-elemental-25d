export const BOUNDS={x:11.5,z:9.5},PILLARS=[[-7,-4],[7,-4],[-7,4],[7,4]],RADIUS=.38;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const forward=yaw=>({x:Math.sin(yaw),z:-Math.cos(yaw)});
export function move(p,dx,dz){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));for(let i=0;i<steps;i++){p.x=clamp(p.x+dx/steps,-BOUNDS.x,BOUNDS.x);p.z=clamp(p.z+dz/steps,-BOUNDS.z,BOUNDS.z);for(const [x,z] of PILLARS){const vx=p.x-x,vz=p.z-z,d=Math.hypot(vx,vz),r=.72+RADIUS;if(d<r){p.x=x+(d?vx/d:1)*r;p.z=z+(d?vz/d:0)*r;}}}}
export function motion(p,input,dt){p.yaw=input.yaw??p.yaw;p.pitch=input.pitch??p.pitch;
 if(p.burst){const b=p.burst;b.elapsed=Math.min(b.duration,b.elapsed+dt);const t=b.elapsed/b.duration,e=t*t*(3-2*t),x=b.fromX+(b.toX-b.fromX)*e,z=b.fromZ+(b.toZ-b.fromZ)*e;move(p,x-b.previousX,z-b.previousZ);b.previousX=x;b.previousZ=z;}
 else{const f=forward(p.yaw),len=Math.max(1,Math.hypot(input.forward||0,input.strafe||0)),speed=(p.speed||115)/25*(p.slow>0?.4:1);move(p,(f.x*(input.forward||0)+Math.cos(p.yaw)*(input.strafe||0))/len*speed*dt,(f.z*(input.forward||0)+Math.sin(p.yaw)*(input.strafe||0))/len*speed*dt);}
 if(input.jump&&p.y<=0)p.vy=6.3;p.vy-=18*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0)p.vy=0;
}
export function segmentDistance(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);return {distance:Math.hypot(x-ax-t*dx,z-az-t*dz),t};}
