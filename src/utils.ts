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

  if (v1.lengthSquared() === 0 || v2.lengthSquared() === 0) {
    return 0;
  }

  const v1Norm = v1.normalizeToNew();
  const v2Norm = v2.normalizeToNew();

  const dot = BABYLON.Scalar.Clamp(v1Norm.dot(v2Norm), -1, 1);

  const angle = Math.acos(dot);

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


/**
 * Calculates the forearm twist angle around the upper arm axis.
 * @param {Vector3} pShoulder - World position of shoulder
 * @param {Vector3} pElbow - World position of elbow
 * @param {Vector3} pWrist - World position of wrist
 * @param {Vector3} defaultUp - Reference 'up' direction of the body/torso
 * @returns {number} Twist angle in radians
 */
export function calculateArmTwistAngle(
  pShoulder: BABYLON.Vector3,
  pElbow: BABYLON.Vector3,
  pWrist: BABYLON.Vector3,
  defaultUp = BABYLON.Vector3.Up(),
) {
  // 1. Compute bone vectors
  const vUpper = pElbow.subtract(pShoulder);
  const vForearm = pWrist.subtract(pElbow);

  // Twist axis (normalized upper arm)
  const u = vUpper.normalizeToNew();

  // 2. Project default reference direction onto the plane perpendicular to u
  let ref = defaultUp.subtract(u.scale(BABYLON.Vector3.Dot(defaultUp, u)));
  if (ref.lengthSquared() < 1e-6) {
    // Fallback if upper arm aligns perfectly with defaultUp
    ref = BABYLON.Vector3.Forward().subtract(u.scale(BABYLON.Vector3.Dot(BABYLON.Vector3.Forward(), u)));
  }
  ref.normalize();

  // Orthogonal vector in the projection plane
  const w = BABYLON.Vector3.Cross(u, ref).normalize();

  // 3. Project current forearm vector onto the plane perpendicular to u
  const vProj = vForearm.subtract(u.scale(BABYLON.Vector3.Dot(vForearm, u)));
  const vProjNorm = vProj.normalizeToNew();

  // 4. Calculate signed angle using 2D projection components
  const x = BABYLON.Vector3.Dot(vProjNorm, ref);
  const y = BABYLON.Vector3.Dot(vProjNorm, w);

  return Math.atan2(y, x);
}