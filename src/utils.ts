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

// Convert Blazepose coordinate to Babylon coordinate
export function invertYAxis(vector3: BABYLON.Vector3) {
  return new BABYLON.Vector3(vector3.x, -vector3.y, vector3.z);
}

export function invertZAxis(vector3: BABYLON.Vector3) {
  return new BABYLON.Vector3(vector3.x, vector3.y, -vector3.z);
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

  if (v1.lengthSquared() === 0 || v2.lengthSquared() === 0) {
    return 0;
  }

  const v1Norm = v1.normalizeToNew();
  const v2Norm = v2.normalizeToNew();

  const dot = BABYLON.Scalar.Clamp(v1Norm.dot(v2Norm), -1, 1);

  const angle = Math.acos(dot);

  return angle;
}


export function angleBetweenVectorsNormal(a: BABYLON.Vector3, b: BABYLON.Vector3, c: BABYLON.Vector3) {
  const v1 = a.subtract(b);
  const v2 = c.subtract(b);
  const normal = BABYLON.Vector3.Cross(v1, v2).normalize();

  if (v1.lengthSquared() === 0 || v2.lengthSquared() === 0) {
    return 0;
  }

  const angle = BABYLON.Vector3.GetAngleBetweenVectors(v1, v2, normal);

  return angle;
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


export function makeBasis(forward: BABYLON.Vector3, up: BABYLON.Vector3) {
  const Z = forward.normalize();
  const X = BABYLON.Vector3.Cross(up, Z).normalize();
  const Y = BABYLON.Vector3.Cross(Z, X).normalize();

  const basis = new BABYLON.Matrix();
  BABYLON.Matrix.FromXYZAxesToRef(X, Y, Z, basis);
  return basis;
}


/**
 * Calculates the twist angle (in radians) of the palm around the arm axis.
 * @param {BABYLON.Vector3} a1 Initial arm vector
 * @param {BABYLON.Vector3} p1 Initial palm vector
 * @param {BABYLON.Vector3} a2 Target arm vector
 * @param {BABYLON.Vector3} p2 Target palm vector
 * @returns {number} Twist angle in radians
 */
export function getPalmTwistAngle(a1: BABYLON.Vector3, p1: BABYLON.Vector3, a2: BABYLON.Vector3, p2: BABYLON.Vector3) {
  // 1. Normalize input vectors
  const arm1 = a1.clone().normalize();
  const palm1 = p1.clone().normalize();
  const arm2 = a2.clone().normalize();
  const palm2 = p2.clone().normalize();

  // 2. Build initial frame (R1)
  const z1 = BABYLON.Vector3.Cross(arm1, palm1).normalize();
  const mat1 = new BABYLON.Matrix();
  BABYLON.Matrix.FromXYZAxesToRef(arm1, palm1, z1, mat1);
  const q1 = BABYLON.Quaternion.FromRotationMatrix(mat1);

  // 3. Build target frame (R2)
  const z2 = BABYLON.Vector3.Cross(arm2, palm2).normalize();
  const mat2 = new BABYLON.Matrix();
  BABYLON.Matrix.FromXYZAxesToRef(arm2, palm2, z2, mat2);
  const q2 = BABYLON.Quaternion.FromRotationMatrix(mat2);

  // 4. Compute total relative rotation Q_total = Q2 * Q1^-1
  const qTotal = q2.multiply(BABYLON.Quaternion.Inverse(q1));

  // 5. Compute swing rotation (from arm1 to arm2)
  const qSwing = BABYLON.Quaternion.FromUnitVectorsToRef(arm1, arm2, new BABYLON.Quaternion());

  // 6. Extract twist rotation Q_twist = Q_swing^-1 * Q_total
  const qTwist = BABYLON.Quaternion.Inverse(qSwing).multiply(qTotal);

  // 7. Calculate twist angle around target arm axis (arm2)
  const twistVec = new BABYLON.Vector3(qTwist.x, qTwist.y, qTwist.z);
  const angle = 2 * Math.atan2(BABYLON.Vector3.Dot(twistVec, arm2), qTwist.w);

  return angle; // Angle in radians (multiply by 180 / Math.PI for degrees)
}


export function getPhysicalPalmTwist(a1: BABYLON.Vector3, p1: BABYLON.Vector3, a2: BABYLON.Vector3, p2: BABYLON.Vector3) {
  // 1. Normalize inputs
  const arm1 = a1.clone().normalize();
  const palm1 = p1.clone().normalize();
  const arm2 = a2.clone().normalize();
  const palm2 = p2.clone().normalize();

  // 2. Transport the initial palm (p1) to the new arm orientation
  //    using the shoulder's primary bend axis
  const bendAxis = BABYLON.Vector3.Cross(arm1, arm2);

  let expectedPalm;
  if (bendAxis.lengthSquared() < 0.0001) {
    expectedPalm = palm1.clone();
  } else {
    bendAxis.normalize();
    const bendAngle = Math.acos(BABYLON.Vector3.Dot(arm1, arm2));
    const swingMatrix = BABYLON.Matrix.RotationAxis(bendAxis, bendAngle);
    expectedPalm = BABYLON.Vector3.TransformNormal(palm1, swingMatrix);
  }

  // 3. Project expectedPalm and actual palm2 onto plane perpendicular to arm2
  const projExpected = expectedPalm.subtract(arm2.scale(BABYLON.Vector3.Dot(expectedPalm, arm2))).normalize();
  const projActual = palm2.subtract(arm2.scale(BABYLON.Vector3.Dot(palm2, arm2))).normalize();

  // 4. Calculate signed angle around arm2
  const cross = BABYLON.Vector3.Cross(projExpected, projActual);
  const dot = BABYLON.Vector3.Dot(projExpected, projActual);
  const angle = Math.atan2(BABYLON.Vector3.Dot(cross, arm2), dot);

  return angle;
}


function projectToVector(u: BABYLON.Vector3, v: BABYLON.Vector3) {
  return v.scale(u.dot(v) / v.lengthSquared());
}

export function projectToPlane(u: BABYLON.Vector3, normal: BABYLON.Vector3) {
  return u.subtract(projectToVector(u, normal));
}

export function getArmTwistAngle(
  poseUpperArm: BABYLON.Vector3,
  poseLowerArm: BABYLON.Vector3,
  restUpperArm: BABYLON.Vector3,
  restNormal: BABYLON.Vector3,
) {
  const rotation = BABYLON.Quaternion.FromUnitVectorsToRef(
    restUpperArm,
    poseUpperArm,
    new BABYLON.Quaternion(),
  );

  const projLowerArm = projectToPlane(poseLowerArm, poseUpperArm);
  const projLowerArmRest = projLowerArm.rotateByQuaternionToRef(rotation.invert(), new BABYLON.Vector3());

  const cross = restNormal.cross(projLowerArmRest);
  const sin = restUpperArm.dot(cross);
  const cos = BABYLON.Scalar.Clamp(restNormal.dot(projLowerArmRest), -1.0, 1.0);
  const angle = Math.atan2(sin, cos);

  // console.log('Projected: ', projLowerArmRest.toString());
  // console.log('Normal: ', restNormal.toString());
  // console.log('Angle: ', angle);

  return angle;
}

export function parseLandmark(landmark: Landmark) {
  const position = invertYAxis(landmarkToVector(landmark));
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
    position,
  };
}