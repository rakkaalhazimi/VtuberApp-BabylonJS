import * as BABYLON from '@babylonjs/core';

import type { GuiderState } from "@/mmd/guider-state";
import type { MMDBoneState } from "@/mmd/mmd-bone-state";



export class PoseMMDGuider {
  constructor(public mmdBoneState: MMDBoneState) { }

  guideUpperBody(state: GuiderState) {
    const pitchQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(1, 0, 0),
      state.upperBodyPitch,
    );
    const yawQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 1, 0),
      state.upperBodyYaw,
    );
    const rollQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 0, 1),
      state.upperBodyRoll,
    );

    const targetQuaternion = pitchQ.multiply(yawQ).multiply(rollQ);
    const upperBody = this.mmdBoneState.UPPER_BODY!;

    upperBody.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      upperBody.bone.rotationQuaternion,
      targetQuaternion,
      1,
    );
  }

  guideLeftArm(state: GuiderState) {
    const leftArm = this.mmdBoneState.LEFT_ARM!;
    leftArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArm.bone.rotationQuaternion,
      state.leftArmQuaternion,
      0.1,
    );
  }

  guideRightArm(state: GuiderState) {
    const rightArm = this.mmdBoneState.RIGHT_ARM!;
    rightArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArm.bone.rotationQuaternion,
      state.rightArmQuaternion,
      0.1,
    );
  }
}