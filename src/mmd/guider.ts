import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { PoseLandmarkerPoint } from '@/computer-vision/pose-estimation';
import { landmarkToVector, invertYAxis } from '@/utils';



const NEUTRAL_SHOULDER_Z = -0.1;
const ANGLE_THRESHOLD_RADIANS = BABYLON.Angle.FromDegrees(1.5).radians();

export class MMDMovementGuider {

  private upperBodyPitch: number = 0;
  private upperBodyYaw: number = 0;
  private upperBodyRoll: number = 0;

  constructor(public model: BABYLONMMD.MmdModel) { }

  smooth(oldValue: number, newValue: number) {
    return (newValue - oldValue) * 0.05;
  }

  guideUpperBodyMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const upperBody = this.model.runtimeBones.find(b => b.name === '上半身');
    if (!upperBody) return;

    const poseLeftHip = landmarks[PoseLandmarkerPoint.LEFT_HIP];
    const poseRightHip = landmarks[PoseLandmarkerPoint.RIGHT_HIP];
    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];

    const leftHip = landmarkToVector(poseLeftHip);
    const rightHip = landmarkToVector(poseRightHip);
    const leftShoulder = landmarkToVector(poseLeftShoulder);
    const rightShoulder = landmarkToVector(poseRightShoulder);

    const midHip = BABYLON.Vector3.Center(leftHip, rightHip);
    const midShoulder = BABYLON.Vector3.Center(leftShoulder, rightShoulder);
    midShoulder.z -= NEUTRAL_SHOULDER_Z;  // Subtracted by neutral shoulder z position

    // Pitch (Rotation around horizontal axis)
    const bodyLean = invertYAxis(midShoulder.subtract(midHip));
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
    const bodyTwist = leftShoulder.subtract(rightShoulder);
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
    const bodyTilt = invertYAxis(midShoulder.subtract(midHip));
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
    upperBody.linkedBone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      upperBody.linkedBone.rotationQuaternion,
      targetQuaternion,
      0.1,
    );
  }


  guideLeftArmMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const leftShoulder = this.model.runtimeBones.find(b => b.name === '左肩');
    const leftArm = this.model.runtimeBones.find(b => b.name === '左腕');
    const leftElbow = this.model.runtimeBones.find(b => b.name === '左ひじ');
    if (!leftShoulder || !leftArm || !leftElbow) return;

    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];

    const vectorLeftShoulder = landmarkToVector(poseLeftShoulder);
    const vectorLeftElbow = landmarkToVector(poseLeftElbow);
    const cartesianLeftElbow = invertYAxis(vectorLeftElbow.subtract(vectorLeftShoulder));

    const leftElbowRest = leftElbow.linkedBone.position.subtract(leftShoulder.linkedBone.position);

    const targetVectorTest = new BABYLON.Vector3(0.300, 0.400, 0.866);

    const leftArmTargetQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      leftElbowRest.normalizeToNew(),
      cartesianLeftElbow.normalizeToNew(),
      leftArmTargetQuaternion,
    );
    leftArm.linkedBone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArm.linkedBone.rotationQuaternion,
      leftArmTargetQuaternion,
      0.1,
    );
  }

}