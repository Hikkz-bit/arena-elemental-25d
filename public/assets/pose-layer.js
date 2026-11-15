// Procedural rotations (guard side, vertical aim, lean, leg twist) are added on top of the pose the mixer wrote.
// three's mixer only writes a bone when its blended value changed since the previous frame: on a frame where
// it did not (two frames inside a flat stretch of a clip, or a clip clamped on its last frame), the bone still
// holds last frame's result and the same rotations would be added a second time, twisting the body for a frame.
// The layer remembers the animated value of each bone it touches and puts it back when the mixer left it alone.
export function createPoseLayer(bones){return bones.filter(Boolean).map(bone=>({bone,base:bone.quaternion.clone(),out:bone.quaternion.clone(),written:false}));}
// Call after mixer.update and before any procedural rotation.
export function beginPose(layer){for(const s of layer){if(s.written&&s.bone.quaternion.equals(s.out))s.bone.quaternion.copy(s.base);else s.base.copy(s.bone.quaternion);}}
// Call after the last procedural rotation of the frame.
export function endPose(layer){for(const s of layer){s.out.copy(s.bone.quaternion);s.written=true;}}
