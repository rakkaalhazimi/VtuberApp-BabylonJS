import * as BABYLON from '@babylonjs/core';
// import * as BABYLONMMD from 'babylon-mmd';

import type { HandLandmarkState } from "@/computer-vision/hand-landmark-state";
import type { PoseLandmarkState } from "@/computer-vision/pose-landmark-state";
import { GuiderState } from '@/mmd/guider-state';
import { type MMDBoneState } from "@/mmd/mmd-bone-state";
import { smooth } from '@/utils';


const NEUTRAL_SHOULDER_Z = -0.1;
const ANGLE_THRESHOLD_RADIANS = BABYLON.Angle.FromDegrees(1.5).radians();
const LEFT_ARM_DEFAULT_QUATERNION = BABYLON.Quaternion.FromEulerAngles(0, 0, -0.6);

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
}