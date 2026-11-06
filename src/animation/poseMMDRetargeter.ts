import * as BABYLON from '@babylonjs/core';
// import * as BABYLONMMD from 'babylon-mmd';

import type { HandLandmarkState } from "@/computer-vision/hand-landmark-state";
import type { PoseLandmarkState } from "@/computer-vision/pose-landmark-state";
import { GuiderState } from '@/mmd/guider-state';
import { type MMDBoneState } from "@/mmd/mmd-bone-state";
import { angleBetweenVectors3D, getArmTwistAngle, invertYAxis, invertZAxis, smooth } from '@/utils';



const HEAD_PITCH_LIMIT = BABYLON.Angle.FromDegrees(45).radians();
const HEAD_YAW_LIMIT = BABYLON.Angle.FromDegrees(90).radians();
const HEAD_ROLL_LIMIT = BABYLON.Angle.FromDegrees(45).radians();

const NEUTRAL_SHOULDER_Z = -0.1;
const ANGLE_THRESHOLD_RADIANS = BABYLON.Angle.FromDegrees(1.5).radians();
const LEFT_ARM_DEFAULT_QUATERNION = BABYLON.Quaternion.FromEulerAngles(0, 0, -0.6);
const RIGHT_ARM_DEFAULT_QUATERNION = BABYLON.Quaternion.FromEulerAngles(0, 0, 0.6);

export class PoseMMDRetargeter {
  public state = new GuiderState();
  public poseState: PoseLandmarkState;
  public handState: HandLandmarkState;

  constructor(public mmdBoneState: MMDBoneState) { }

  updatePoseState(state: PoseLandmarkState) {
    this.poseState = state;
  }
  updateHandState(state: HandLandmarkState) {
    this.handState = state;
  }

  retargetHead() {
    if (!this.poseState) return this.state;

    const poseNose = this.poseState.NOSE;
    const poseLeftEar = this.poseState.LEFT_EAR;
    const poseRightEar = this.poseState.RIGHT_EAR;
    const poseMouthLeft = this.poseState.MOUTH_LEFT;
    const poseMouthRight = this.poseState.MOUTH_RIGHT;

    const earVisibility = ((poseLeftEar.visibility ?? 1) + (poseRightEar.visibility ?? 1)) / 2;
    const noseVisibility = poseNose.visibility ?? 1;
    const mouthVisibility = ((poseMouthLeft.visibility ?? 1) + (poseMouthRight.visibility ?? 1)) / 2;
    if (earVisibility < 0.5 && noseVisibility < 0.5) {
      // Face lost: ease back to neutral
      this.state.headPitch *= 0.9;
      this.state.headYaw *= 0.9;
      this.state.headRoll *= 0.9;
      return this.state;
    }

    const poseVecMidEar = BABYLON.Vector3.Center(poseLeftEar.position, poseRightEar.position);
    const poseVecMidMouth = BABYLON.Vector3.Center(poseMouthLeft.position, poseMouthRight.position);

    // Face width as a scale reference (guard against degenerate landmarks)
    const earDist = Math.max(poseLeftEar.position.subtract(poseRightEar.position).length(), 1e-4);

    // Yaw (rotation around vertical Y axis, turning left/right)
    // Nose lateral offset from mid-ear line, normalized by face width.
    // Negated to flip MediaPipe horizontal into Babylon space (same convention as upper body).
    const noseDx = poseNose.x - poseVecMidEar.x;
    const yawTarget = BABYLON.Scalar.Clamp(
      -(noseDx / earDist) * 1.5,
      -HEAD_YAW_LIMIT,
      HEAD_YAW_LIMIT,
    );
    if (Math.abs(yawTarget) > ANGLE_THRESHOLD_RADIANS) {
      this.state.headYaw = smooth(this.state.headYaw, yawTarget);
    }
    if (earVisibility < 0.5) {
      this.state.headYaw *= 0.9;
    }

    // Pitch (rotation around horizontal X axis, nodding up/down)
    // Raw MediaPipe +y points down, so noseDrop > 0 at neutral and grows when looking down.
    // Calibrate neutral on first valid frame, then map the delta to a pitch angle.
    const noseDrop = poseNose.y - poseVecMidEar.y;
    if (this.state.neutralNoseDrop === null && noseVisibility >= 0.5) {
      this.state.neutralNoseDrop = noseDrop;
    }
    const neutralDrop = this.state.neutralNoseDrop ?? noseDrop;
    // Looking down increases noseDrop -> negative X rotation nods the MMD head down
    // (model faces -Z, so -X tips the face downward).
    const pitchTarget = BABYLON.Scalar.Clamp(
      -((noseDrop - neutralDrop) / earDist) * 2.0,
      -HEAD_PITCH_LIMIT,
      HEAD_PITCH_LIMIT,
    );
    if (Math.abs(pitchTarget) > ANGLE_THRESHOLD_RADIANS) {
      this.state.headPitch = smooth(this.state.headPitch, pitchTarget);
    }
    if (noseVisibility < 0.5) {
      this.state.headPitch *= 0.9;
    }

    // Roll (rotation around forward Z axis, sideways tilt)
    // Same pattern as upper body: up-vector of the face, atan2(x, y) is ~0 at neutral.
    const faceUp = invertYAxis(poseVecMidEar.subtract(poseVecMidMouth));
    const rollTarget = BABYLON.Scalar.Clamp(
      Math.atan2(faceUp.x, Math.max(faceUp.y, 1e-4)),
      -HEAD_ROLL_LIMIT,
      HEAD_ROLL_LIMIT,
    );
    if (Math.abs(rollTarget) > ANGLE_THRESHOLD_RADIANS) {
      this.state.headRoll = smooth(this.state.headRoll, rollTarget);
    }
    if (mouthVisibility < 0.5) {
      this.state.headRoll = 0.9;
    }

    return this.state;
  }

  retargetUpperBody() {
    if (!this.poseState) return this.state;

    const poseVecMidHip = BABYLON.Vector3.Center(this.poseState.LEFT_HIP.position, this.poseState.RIGHT_HIP.position);
    const poseVecMidShoulder = BABYLON.Vector3.Center(this.poseState.LEFT_SHOULDER.position, this.poseState.RIGHT_SHOULDER.position);
    poseVecMidShoulder.z -= NEUTRAL_SHOULDER_Z;  // Subtracted by neutral shoulder z position

    // Pitch (Rotation around horizontal axis)
    const bodyLean = poseVecMidShoulder.subtract(poseVecMidHip);
    const pitch = Math.atan2(bodyLean.z, bodyLean.y);
    if (Math.abs(pitch) > ANGLE_THRESHOLD_RADIANS) {
      this.state.upperBodyPitch = smooth(this.state.upperBodyPitch, pitch);  // Exponential Moving Average
    }
    const hipVisbility = (this.poseState.LEFT_HIP.visibility + this.poseState.RIGHT_HIP.visibility) / 2;
    if (hipVisbility < 0.5) {
      // this.state.upperBodyPitch = 0;
    }

    // Yaw (Rotation around vertical axis)
    const bodyTwist = this.poseState.LEFT_SHOULDER.position.subtract(this.poseState.RIGHT_SHOULDER.position);
    const yaw = Math.atan2(bodyTwist.z, bodyTwist.x);
    if (Math.abs(yaw) > ANGLE_THRESHOLD_RADIANS) {
      this.state.upperBodyYaw = smooth(this.state.upperBodyYaw, -yaw); // Flip horizontal
    }
    const shoulderVisbility = (this.poseState.LEFT_SHOULDER.visibility + this.poseState.RIGHT_SHOULDER.visibility) / 2;
    if (shoulderVisbility < 0.5) {
      this.state.upperBodyYaw = 0;
    }

    // Roll (Rotation around forward axis, lateral / sideways tilt)
    const bodyTilt = poseVecMidShoulder.subtract(poseVecMidHip);
    const roll = Math.atan2(bodyTilt.x, bodyTilt.y);
    if (Math.abs(roll) > ANGLE_THRESHOLD_RADIANS) {
      this.state.upperBodyRoll = smooth(this.state.upperBodyRoll, roll);
    }
    if (shoulderVisbility < 0.5) {
      this.state.upperBodyRoll = 0;
    }

    return this.state;
  }

  retargetLeftArm() {
    if (!this.poseState) return this.state;

    const leftShoulder = this.mmdBoneState.LEFT_SHOULDER!;
    const leftElbow = this.mmdBoneState.LEFT_ELBOW!;

    const poseLeftShoulder = this.poseState.LEFT_SHOULDER;
    const poseLeftElbow = this.poseState.LEFT_ELBOW;

    const poseDirLeftElbow = poseLeftElbow.position.subtract(poseLeftShoulder.position);

    const leftElbowRestDir = leftElbow.restPosition.subtract(leftShoulder.restPosition);

    if (poseLeftElbow.visibility < 0.5) {
      this.state.leftArmQuaternion = LEFT_ARM_DEFAULT_QUATERNION;
      return this.state;
    };

    const leftArmTargetQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      leftElbowRestDir.normalizeToNew(),
      poseDirLeftElbow.normalizeToNew(),
      leftArmTargetQuaternion,
    );
    this.state.leftArmQuaternion = leftArmTargetQuaternion;

    return this.state;
  }

  retargetRightArm() {
    if (!this.poseState) return this.state;

    const rightShoulder = this.mmdBoneState.RIGHT_SHOULDER!;
    const rightElbow = this.mmdBoneState.RIGHT_ELBOW!;

    const poseRightShoulder = this.poseState.RIGHT_SHOULDER;
    const poseRightElbow = this.poseState.RIGHT_ELBOW;

    const poseDirRightElbow = poseRightElbow.position.subtract(poseRightShoulder.position);

    const rightElbowRestDir = rightElbow.restPosition.subtract(rightShoulder.restPosition);

    if (poseRightElbow.visibility < 0.5) {
      this.state.rightArmQuaternion = RIGHT_ARM_DEFAULT_QUATERNION;
      return this.state;
    };

    const rightArmTargetQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      rightElbowRestDir.normalizeToNew(),
      poseDirRightElbow.normalizeToNew(),
      rightArmTargetQuaternion,
    );
    this.state.rightArmQuaternion = rightArmTargetQuaternion;

    return this.state;
  }

  retargetLeftElbow() {
    if (!this.poseState) return;

    const leftShoulder = this.mmdBoneState.LEFT_SHOULDER!;
    const leftElbow = this.mmdBoneState.LEFT_ELBOW!;
    const leftWrist = this.mmdBoneState.LEFT_WRIST!;
    const leftArmTwist = this.mmdBoneState.LEFT_ARM_TWIST!;

    const restUpperArm = leftElbow.restPosition.subtract(leftShoulder.restPosition).normalize();
    const restLowerArm = leftWrist.restPosition.subtract(leftElbow.restPosition).normalize();

    const side = restUpperArm.clone();
    const forward = side.cross(restLowerArm);
    const restNormal = invertZAxis(side.cross(forward)); // up
    // console.log('Rest normal: ', restNormal.toString());

    const poseLeftShoulder = this.poseState.LEFT_SHOULDER;
    const poseLeftElbow = this.poseState.LEFT_ELBOW;
    const poseLeftWrist = this.poseState.LEFT_WRIST;

    const poseUpperArm = poseLeftElbow.position.subtract(poseLeftShoulder.position).normalize();
    const poseLowerArm = poseLeftWrist.position.subtract(poseLeftElbow.position).normalize();

    const restAngle = angleBetweenVectors3D(leftShoulder.restPosition, leftElbow.restPosition, leftWrist.restPosition); // ~167 degrees (in radians)
    const poseAngle = angleBetweenVectors3D(poseLeftShoulder.position, poseLeftElbow.position, poseLeftWrist.position, true); // 2D Angle
    const poseTwistAngle = getArmTwistAngle(poseUpperArm, poseLowerArm, restUpperArm, restNormal);
    // console.log('Pose angle: ', poseAngle);
    // console.log('Pose twist angle: ', poseTwistAngle);

    // 1. Calculate how much the elbow is bent relative to rest (0 when straight/extended)
    let bendAngleRad = restAngle - poseAngle;

    // 2. Clamp to 1-way bending: prevents hyper-extension (< 0) and limits maximum flexion to near PI rad (~170°)
    const MAX_FLEXION = Math.PI - 0.17; // ~170 degrees max physical bend limit
    bendAngleRad = Math.max(0, Math.min(bendAngleRad, MAX_FLEXION));

    // 3. Apply single Z-axis hinge rotation
    // Note: If the elbow bends in the wrong direction, invert the sign (-bendAngleRad)
    this.state.leftElbowHingeQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), bendAngleRad);
    this.state.leftArmTwistQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), poseTwistAngle);

    return this.state;
  }

  retargetRightElbow() {
    if (!this.poseState) return;

    const rightShoulder = this.mmdBoneState.RIGHT_SHOULDER!;
    const rightElbow = this.mmdBoneState.RIGHT_ELBOW!;
    const rightWrist = this.mmdBoneState.RIGHT_WRIST!;

    const restUpperArm = rightElbow.restPosition.subtract(rightShoulder.restPosition).normalize();
    const restLowerArm = rightWrist.restPosition.subtract(rightElbow.restPosition).normalize();

    const side = restUpperArm.clone();
    const forward = side.cross(restLowerArm);
    const restNormal = invertZAxis(side.cross(forward)); // up

    const poseRightShoulder = this.poseState.RIGHT_SHOULDER;
    const poseRightElbow = this.poseState.RIGHT_ELBOW;
    const poseRightWrist = this.poseState.RIGHT_WRIST;

    const poseUpperArm = poseRightElbow.position.subtract(poseRightShoulder.position).normalize();
    const poseLowerArm = poseRightWrist.position.subtract(poseRightElbow.position).normalize();

    const restAngle = angleBetweenVectors3D(rightShoulder.restPosition, rightElbow.restPosition, rightWrist.restPosition); // ~167 degrees (in radians)
    const poseAngle = angleBetweenVectors3D(poseRightShoulder.position, poseRightElbow.position, poseRightWrist.position, true); // 2D Angle
    const poseTwistAngle = getArmTwistAngle(poseUpperArm, poseLowerArm, restUpperArm, restNormal);

    // 1. Calculate how much the elbow is bent relative to rest (0 when straight/extended)
    let bendAngleRad = restAngle - poseAngle;

    // 2. Clamp to 1-way bending: prevents hyper-extension (< 0) and limits maximum flexion to near PI rad (~170°)
    const MAX_FLEXION = Math.PI - 0.17; // ~170 degrees max physical bend limit
    bendAngleRad = Math.max(0, Math.min(bendAngleRad, MAX_FLEXION));

    // 3. Apply single Z-axis hinge rotation (mirrored vs left, hence negated)
    this.state.rightElbowHingeQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -bendAngleRad);
    this.state.rightArmTwistQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), -poseTwistAngle);

    return this.state;
  }
}