import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";



export function loopBack(min: number, max: number, step: number) {
  let current = 0;
  let direction = 1;
  return () => {
    if (current > max) {
      current = max;
      direction = -1;
    }
    if (current < min) {
      current = min;
      direction = 1;
    }
    current += step * direction;
    return current;
  };
}

export function landmarkToVector(landmark: NormalizedLandmark) {
  return new BABYLON.Vector3(landmark.x, landmark.y, landmark.z);
}

// Convert any vector from top-left origin into center origin (origin is [0, 0])
export function invertYAxis(vector3: BABYLON.Vector3) {
  return new BABYLON.Vector3(vector3.x, -vector3.y, vector3.z);
}


function normalizeRadians(radians: number) {
  if (radians >= Math.PI / 2) {
    radians -= Math.PI * 2;
  }
  if (radians <= -Math.PI / 2) {
    radians += Math.PI * 2;
    radians = Math.PI - radians;
  }
  //returns normalized values to -1,1
  return radians / Math.PI;
}


export function angleBetweenVectors3D(a: BABYLON.Vector3, b: BABYLON.Vector3, c: BABYLON.Vector3) {
  const v1 = a.subtract(b);
  const v2 = c.subtract(b);

  const v1Norm = v1.normalizeToNew();
  const v2Norm = v2.normalizeToNew();

  const dot = BABYLON.Scalar.Clamp(v1Norm.dot(v2Norm), -1, 1);

  const angle = Math.acos(dot);

  return angle;
  // return normalizeRadians(angle);
}


export function getBoneRestPosition(mesh: BABYLON.Mesh, bone: BABYLON.Bone): BABYLON.Vector3 {
  // 1. Get the local rest matrix of the bone
  const localRestMatrix = bone.getRestMatrix();

  // 2. Compute the world space rest matrix by compounding up the skeleton hierarchy
  const worldRestMatrix = localRestMatrix.clone();
  let parent = bone.getParent();
  while (parent) {
    worldRestMatrix.multiplyToRef(parent.getRestMatrix(), worldRestMatrix);
    parent = parent.getParent();
  }

  // 3. Apply the parent mesh's world matrix to respect its global positioning/scaling
  worldRestMatrix.multiplyToRef(mesh.getWorldMatrix(), worldRestMatrix);

  // 4. Extract the absolute position vector
  const restPosition = worldRestMatrix.getTranslation();
  console.log("Rest Position:", restPosition.toString());
  return restPosition;
}