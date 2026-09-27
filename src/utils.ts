import * as BABYLON from '@babylonjs/core';
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