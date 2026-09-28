import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { PoseLandmarkerPoint } from '@/computer-vision/pose-estimation';

import { MMDBoneManager } from '@/mmd/bone-manager';
import { boneTranslations } from '@/mmd/translation';
import { angleBetweenVectors3D, landmarkToVector, invertYAxis, getBoneRestPosition } from '@/utils';



const NEUTRAL_SHOULDER_Z = -0.1;
const ANGLE_THRESHOLD_RADIANS = BABYLON.Angle.FromDegrees(1.5).radians();

export class MMDMovementGuider {

  private boneManager: MMDBoneManager;

  private upperBodyPitch: number = 0;
  private upperBodyYaw: number = 0;
  private upperBodyRoll: number = 0;

  constructor(public model: BABYLONMMD.MmdModel) {
    this.boneManager = new MMDBoneManager(model);
  }

  smooth(oldValue: number, newValue: number) {
    return (newValue - oldValue) * 0.05;
  }

  guideUpperBodyMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const upperBody = this.boneManager.getBoneByName(boneTranslations.UPPER_BODY.localName);
    if (!upperBody) return;

    const poseLeftHip = landmarks[PoseLandmarkerPoint.LEFT_HIP];
    const poseRightHip = landmarks[PoseLandmarkerPoint.RIGHT_HIP];
    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];

    const poseVecLeftHip = landmarkToVector(poseLeftHip);
    const poseVecRightHip = landmarkToVector(poseRightHip);
    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);

    const poseVecMidHip = BABYLON.Vector3.Center(poseVecLeftHip, poseVecRightHip);
    const poseVecMidShoulder = BABYLON.Vector3.Center(poseVecLeftShoulder, poseVecRightShoulder);
    poseVecMidShoulder.z -= NEUTRAL_SHOULDER_Z;  // Subtracted by neutral shoulder z position

    // Pitch (Rotation around horizontal axis)
    const bodyLean = invertYAxis(poseVecMidShoulder.subtract(poseVecMidHip));
    const pitch = Math.atan2(bodyLean.z, bodyLean.y);
    if (Math.abs(pitch) > ANGLE_THRESHOLD_RADIANS) {
      this.upperBodyPitch += this.smooth(this.upperBodyPitch, pitch);  // Exponential Moving Average
    }
    const hipVisbility = (poseLeftHip.visibility + poseRightHip.visibility) / 2;
    if (hipVisbility < 0.5) {
      // this.upperBodyPitch = 0;
    }
    const pitchQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(1, 0, 0),
      this.upperBodyPitch,
    );

    // Yaw (Rotation around vertical axis)
    const bodyTwist = poseVecLeftShoulder.subtract(poseVecRightShoulder);
    const yaw = Math.atan2(bodyTwist.z, bodyTwist.x);
    if (Math.abs(yaw) > ANGLE_THRESHOLD_RADIANS) {
      this.upperBodyYaw += this.smooth(this.upperBodyYaw, -yaw); // Flip horizontal
      // console.log(yaw);
    }
    const shoulderVisbility = (poseLeftShoulder.visibility + poseRightShoulder.visibility) / 2;
    if (shoulderVisbility < 0.5) {
      this.upperBodyYaw = 0;
    }
    const yawQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 1, 0),
      this.upperBodyYaw,
    );

    // Roll (Rotation around forward axis, lateral / sideways tilt)
    const bodyTilt = invertYAxis(poseVecMidShoulder.subtract(poseVecMidHip));
    const roll = Math.atan2(bodyTilt.x, bodyTilt.y);
    if (Math.abs(roll) > ANGLE_THRESHOLD_RADIANS) {
      this.upperBodyRoll += this.smooth(this.upperBodyRoll, roll);
    }
    if (shoulderVisbility < 0.5) {
      this.upperBodyRoll = 0;
    }
    const rollQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 0, 1),
      this.upperBodyRoll,
    );

    const targetQuaternion = pitchQ.multiply(yawQ).multiply(rollQ);
    upperBody.rotationQuaternion = BABYLON.Quaternion.Slerp(
      upperBody.rotationQuaternion,
      targetQuaternion,
      0.1,
    );
  }

  // Passed
  guideLeftArmMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const leftShoulder = this.boneManager.getBoneByName(boneTranslations.LEFT_SHOULDER.localName);
    const leftArm = this.boneManager.getBoneByName(boneTranslations.LEFT_ARM.localName);
    const leftElbow = this.boneManager.getBoneByName(boneTranslations.LEFT_ELBOW.localName);
    if (!leftShoulder || !leftArm || !leftElbow) return;

    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];

    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecLeftElbow = landmarkToVector(poseLeftElbow);
    const poseDirLeftElbow = invertYAxis(poseVecLeftElbow.subtract(poseVecLeftShoulder));

    const leftElbowRest = leftElbow.position.subtract(leftShoulder.position);

    const targetVectorTest = new BABYLON.Vector3(0.300, 0.400, 0.866);

    const leftArmTargetQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      leftElbowRest.normalizeToNew(),
      poseDirLeftElbow.normalizeToNew(),
      leftArmTargetQuaternion,
    );
    leftArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArm.rotationQuaternion,
      leftArmTargetQuaternion,
      0.1,
    );
  }

  guideRightArmMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const rightShoulder = this.boneManager.getBoneByName(boneTranslations.RIGHT_SHOULDER.localName);
    const rightArm = this.boneManager.getBoneByName(boneTranslations.RIGHT_ARM.localName);
    const rightElbow = this.boneManager.getBoneByName(boneTranslations.RIGHT_ELBOW.localName);
    if (!rightShoulder || !rightArm || !rightElbow) return;

    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseRightElbow = landmarks[PoseLandmarkerPoint.RIGHT_ELBOW];

    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecRightElbow = landmarkToVector(poseRightElbow);
    const poseDirRightElbow = invertYAxis(poseVecRightElbow.subtract(poseVecRightShoulder));

    const rightElbowRest = rightElbow.position.subtract(rightShoulder.position);

    const rightArmTargetQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      rightElbowRest.normalizeToNew(),
      poseDirRightElbow.normalizeToNew(),
      rightArmTargetQuaternion,
    );
    rightArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArm.rotationQuaternion,
      rightArmTargetQuaternion,
      0.1,
    );
  }
}