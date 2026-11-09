import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import * as Kalidokit from 'kalidokit';

import type { GuiderState } from "@/mmd/guider-state";
import type { MMDBoneState } from "@/mmd/mmd-bone-state";
import { morphTranslationsNew } from '@/mmd/translation';



export class PoseMMDGuider {
  constructor(
    public mmdBoneState: MMDBoneState,
    public mmdMorphController: BABYLONMMD.MmdMorphController,
  ) { }

  RotateBone(bone: BABYLON.Bone, euler: {x: number, y: number, z: number}) {
    const targetQuaternion = BABYLON.Quaternion.FromEulerAngles(euler.x, euler.y, euler.z);
    bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      bone.rotationQuaternion,
      targetQuaternion,
      0.1,
    );
  }

  guideFaceKalido(state: GuiderState) {
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.BLINKING.localName, state.eyeBlink);
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.WINK_L.localName, state.eyeLWink);
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.WINK_R.localName, state.eyeRWink);
  }

  guideMouthKalido(state: GuiderState) {
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.VOWEL_A.localName, state.mouthShapeA);
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.VOWEL_I.localName, state.mouthShapeI);
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.VOWEL_U.localName, state.mouthShapeU);
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.VOWEL_E.localName, state.mouthShapeE);
    this.mmdMorphController.setMorphWeight(morphTranslationsNew.VOWEL_O.localName, state.mouthShapeO);
  }

  guideHead(state: GuiderState) {
    const pitchQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(1, 0, 0),
      state.headPitch,
    );
    const yawQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 1, 0),
      state.headYaw,
    );
    const rollQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 0, 1),
      state.headRoll,
    );

    const targetQuaternion = pitchQ.multiply(yawQ).multiply(rollQ);
    const head = this.mmdBoneState.HEAD!;

    head.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      head.bone.rotationQuaternion,
      targetQuaternion,
      0.15,
    );
  }

  guideLeftHandKalido(state: GuiderState) {
    // const leftWrist = this.mmdBoneState.LEFT_WRIST!;
    // this.RotateBone(leftWrist.bone, state.leftWrist);

    const leftThumbDIP = this.mmdBoneState.LEFT_THUMB_2!;
    this.RotateBone(leftThumbDIP.bone, state.leftThumbDIP);
    // const leftThumbPIP = this.mmdBoneState.LEFT_THUMB_1!;
    // this.RotateBone(leftThumbPIP.bone, state.leftThumbPIP);
    const leftThumbMCP = this.mmdBoneState.LEFT_THUMB_0!;
    this.RotateBone(leftThumbMCP.bone, state.leftThumbMCP);

    const leftIndexDIP = this.mmdBoneState.LEFT_INDEX_FINGER_3!;
    this.RotateBone(leftIndexDIP.bone, state.leftIndexDIP);
    const leftIndexPIP = this.mmdBoneState.LEFT_INDEX_FINGER_2!;
    this.RotateBone(leftIndexPIP.bone, state.leftIndexPIP);
    const leftIndexMCP = this.mmdBoneState.LEFT_INDEX_FINGER_1!;
    this.RotateBone(leftIndexMCP.bone, state.leftIndexMCP);

    const leftMiddleDIP = this.mmdBoneState.LEFT_MIDDLE_FINGER_3!;
    this.RotateBone(leftMiddleDIP.bone, state.leftMiddleDIP);
    const leftMiddlePIP = this.mmdBoneState.LEFT_MIDDLE_FINGER_2!;
    this.RotateBone(leftMiddlePIP.bone, state.leftMiddlePIP);
    const leftMiddleMCP = this.mmdBoneState.LEFT_MIDDLE_FINGER_1!;
    this.RotateBone(leftMiddleMCP.bone, state.leftMiddleMCP);

    const leftRingDIP = this.mmdBoneState.LEFT_RING_FINGER_3!;
    this.RotateBone(leftRingDIP.bone, state.leftRingDIP);
    const leftRingPIP = this.mmdBoneState.LEFT_RING_FINGER_2!;
    this.RotateBone(leftRingPIP.bone, state.leftRingPIP);
    const leftRingMCP = this.mmdBoneState.LEFT_RING_FINGER_1!;
    this.RotateBone(leftRingMCP.bone, state.leftRingMCP);

    const leftLittleDIP = this.mmdBoneState.LEFT_LITTLE_FINGER_3!;
    this.RotateBone(leftLittleDIP.bone, state.leftLittleDIP);
    const leftLittlePIP = this.mmdBoneState.LEFT_LITTLE_FINGER_2!;
    this.RotateBone(leftLittlePIP.bone, state.leftLittlePIP);
    const leftLittleMCP = this.mmdBoneState.LEFT_LITTLE_FINGER_1!;
    this.RotateBone(leftLittleMCP.bone, state.leftLittleMCP);
  }

  guideRightHandKalido(state: GuiderState) {
    // const leftWrist = this.mmdBoneState.LEFT_WRIST!;
    // this.RotateBone(leftWrist.bone, state.leftWrist);

    const rightThumbDIP = this.mmdBoneState.RIGHT_THUMB_2!;
    this.RotateBone(rightThumbDIP.bone, state.rightThumbDIP);
    // const rightThumbPIP = this.mmdBoneState.RIGHT_THUMB_1!;
    // this.RotateBone(rightThumbPIP.bone, state.rightThumbPIP);
    const rightThumbMCP = this.mmdBoneState.RIGHT_THUMB_0!;
    this.RotateBone(rightThumbMCP.bone, state.rightThumbMCP);

    const rightIndexDIP = this.mmdBoneState.RIGHT_INDEX_FINGER_3!;
    this.RotateBone(rightIndexDIP.bone, state.rightIndexDIP);
    const rightIndexPIP = this.mmdBoneState.RIGHT_INDEX_FINGER_2!;
    this.RotateBone(rightIndexPIP.bone, state.rightIndexPIP);
    const rightIndexMCP = this.mmdBoneState.RIGHT_INDEX_FINGER_1!;
    this.RotateBone(rightIndexMCP.bone, state.rightIndexMCP);

    const rightMiddleDIP = this.mmdBoneState.RIGHT_MIDDLE_FINGER_3!;
    this.RotateBone(rightMiddleDIP.bone, state.rightMiddleDIP);
    const rightMiddlePIP = this.mmdBoneState.RIGHT_MIDDLE_FINGER_2!;
    this.RotateBone(rightMiddlePIP.bone, state.rightMiddlePIP);
    const rightMiddleMCP = this.mmdBoneState.RIGHT_MIDDLE_FINGER_1!;
    this.RotateBone(rightMiddleMCP.bone, state.rightMiddleMCP);

    const rightRingDIP = this.mmdBoneState.RIGHT_RING_FINGER_3!;
    this.RotateBone(rightRingDIP.bone, state.rightRingDIP);
    const rightRingPIP = this.mmdBoneState.RIGHT_RING_FINGER_2!;
    this.RotateBone(rightRingPIP.bone, state.rightRingPIP);
    const rightRingMCP = this.mmdBoneState.RIGHT_RING_FINGER_1!;
    this.RotateBone(rightRingMCP.bone, state.rightRingMCP);

    const rightLittleDIP = this.mmdBoneState.RIGHT_LITTLE_FINGER_3!;
    this.RotateBone(rightLittleDIP.bone, state.rightLittleDIP);
    const rightLittlePIP = this.mmdBoneState.RIGHT_LITTLE_FINGER_2!;
    this.RotateBone(rightLittlePIP.bone, state.rightLittlePIP);
    const rightLittleMCP = this.mmdBoneState.RIGHT_LITTLE_FINGER_1!;
    this.RotateBone(rightLittleMCP.bone, state.rightLittleMCP);
  }

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

  guideLeftArmTwist(state: GuiderState) {
    const leftArmTwist = this.mmdBoneState.LEFT_ARM_TWIST!;
    leftArmTwist.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArmTwist.bone.rotationQuaternion,
      state.leftArmTwistQuaternion,
      0.1,
    );
  }

  guideLeftElbowHinge(state: GuiderState) {
    const leftElbow = this.mmdBoneState.LEFT_ELBOW!;
    leftElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftElbow.bone.rotationQuaternion,
      state.leftElbowHingeQuaternion,
      0.1,
    );
  }

  guideRightArmTwist(state: GuiderState) {
    const rightArmTwist = this.mmdBoneState.RIGHT_ARM_TWIST!;
    rightArmTwist.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArmTwist.bone.rotationQuaternion,
      state.rightArmTwistQuaternion,
      0.1,
    );
  }

  guideRightElbowHinge(state: GuiderState) {
    const rightElbow = this.mmdBoneState.RIGHT_ELBOW!;
    rightElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightElbow.bone.rotationQuaternion,
      state.rightElbowHingeQuaternion,
      0.1,
    );
  }
}