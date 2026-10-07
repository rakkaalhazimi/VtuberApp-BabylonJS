import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import type { HandLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

import { HandLandmarkerPoint, HandLandmarkerEstimation } from '@/computer-vision/hand-landmarker';
import { PoseLandmarkerPoint } from '@/computer-vision/pose-estimation';
import { MMDBoneManager } from '@/mmd/bone-manager';
import { boneTranslations } from '@/mmd/translation';
import { landmarkToVector, invertYAxis, makeBasis, getPhysicalPalmTwist } from '@/utils';



const NEUTRAL_SHOULDER_Z = -0.1;
const ANGLE_THRESHOLD_RADIANS = BABYLON.Angle.FromDegrees(1.5).radians();

const leftArmDefaultQuaternion = BABYLON.Quaternion.FromEulerAngles(0, 0, -0.6);
const rightArmDefaultQuaternion = BABYLON.Quaternion.FromEulerAngles(0, 0, 0.6);


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

    const leftShoulderRest = this.boneManager.getBoneRestPosition(leftShoulder);
    const leftElbowRestDir = this.boneManager.getBoneRestPosition(leftElbow).subtract(leftShoulderRest);

    const targetVectorTest = new BABYLON.Vector3(0.300, 0.400, 0.866);

    if (poseLeftElbow.visibility < 0.5) {
      leftArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
        leftArm.rotationQuaternion,
        leftArmDefaultQuaternion,
        0.1,
      );
      return;
    };

    const leftArmTargetQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      leftElbowRestDir.normalizeToNew(),
      poseDirLeftElbow.normalizeToNew(),
      leftArmTargetQuaternion,
    );
    leftArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArm.rotationQuaternion,
      leftArmTargetQuaternion,
      0.1,
    );
  }

  guideLeftArmMovementBasis(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const rightShoulder = this.boneManager.getBoneByName(boneTranslations.RIGHT_SHOULDER.localName);
    const leftShoulder = this.boneManager.getBoneByName(boneTranslations.LEFT_SHOULDER.localName);
    const leftArm = this.boneManager.getBoneByName(boneTranslations.LEFT_ARM.localName);
    const leftElbow = this.boneManager.getBoneByName(boneTranslations.LEFT_ELBOW.localName);
    if (!rightShoulder || !leftShoulder || !leftArm || !leftElbow) return;

    const rightShoulderRest = this.boneManager.getBoneRestPosition(rightShoulder);
    const leftShoulderRest = this.boneManager.getBoneRestPosition(leftShoulder);
    const leftElbowRest = this.boneManager.getBoneRestPosition(leftElbow);

    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];

    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecLeftElbow = landmarkToVector(poseLeftElbow);

    if (poseLeftElbow.visibility < 0.5) {
      leftArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
        leftArm.rotationQuaternion,
        leftArmDefaultQuaternion,
        0.1,
      );
      return;
    };

    const restBasis = makeBasis(
      leftElbowRest.subtract(leftShoulderRest),
      rightShoulderRest.subtract(leftShoulderRest),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecLeftElbow.subtract(poseVecLeftShoulder)),
      invertYAxis(poseVecRightShoulder.subtract(poseVecLeftShoulder)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromRotationMatrixToRef(relative, rotation);
    leftArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArm.rotationQuaternion,
      rotation,
      0.1,
    );
  }

  guideLeftForearmTwist(result: PoseLandmarkerResult, hand: HandLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;

    const handLandmarks = HandLandmarkerEstimation.GetLeftHand(hand);
    if (!handLandmarks) return;

    const leftElbow = this.boneManager.getBoneByName(boneTranslations.LEFT_ELBOW.localName);
    const leftWrist = this.boneManager.getBoneByName(boneTranslations.LEFT_WRIST.localName);
    const leftWristTwist = this.boneManager.getBoneByName(boneTranslations.LEFT_WRIST_TWIST.localName);
    const leftIndexMCP = this.boneManager.getBoneByName(boneTranslations.LEFT_INDEX_FINGER_1.localName);
    const leftPinkyMCP = this.boneManager.getBoneByName(boneTranslations.LEFT_LITTLE_FINGER_1.localName);

    if (!leftElbow || !leftWrist || !leftWristTwist || !leftIndexMCP || !leftPinkyMCP) return;

    const restLeftElbow = this.boneManager.getBoneRestPosition(leftElbow);
    const restLeftWrist = this.boneManager.getBoneRestPosition(leftWrist);
    const restLeftIndexMCP = this.boneManager.getBoneRestPosition(leftIndexMCP);
    const restLeftPinkyMCP = this.boneManager.getBoneRestPosition(leftPinkyMCP);

    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];
    const poseLeftWrist = landmarks[PoseLandmarkerPoint.LEFT_WRIST];
    const poseLeftIndexMCP = handLandmarks[HandLandmarkerPoint.INDEX_FINGER_MCP];
    const poseLeftPinkyMCP = handLandmarks[HandLandmarkerPoint.PINKY_MCP];

    const poseVecLeftElbow = landmarkToVector(poseLeftElbow);
    const poseVecLeftWrist = landmarkToVector(poseLeftWrist);
    const poseVecLeftIndexMCP = landmarkToVector(poseLeftIndexMCP);
    const poseVecLeftPinkyMCP = landmarkToVector(poseLeftPinkyMCP);

    const restPalmSurface = restLeftIndexMCP.subtract(restLeftPinkyMCP).normalize();
    const posePalmSurface = poseVecLeftIndexMCP.subtract(poseVecLeftPinkyMCP).normalize();

    const restForearmAxis = restLeftWrist.subtract(restLeftElbow).normalize();
    const poseForearmAxis = poseVecLeftWrist.subtract(poseVecLeftElbow).normalize();

    const twistAngle = getPhysicalPalmTwist(restForearmAxis, restPalmSurface, poseForearmAxis, posePalmSurface);
    const targetQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, -twistAngle); // Invert the twist angle

    leftWristTwist.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftWristTwist.rotationQuaternion,
      targetQuaternion,
      0.1,
    );
  }

  guideRightForearmTwist(result: PoseLandmarkerResult, hand: HandLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;

    const handLandmarks = HandLandmarkerEstimation.GetRightHand(hand);
    if (!handLandmarks) return;

    const rightElbow = this.boneManager.getBoneByName(boneTranslations.RIGHT_ELBOW.localName);
    const rightWrist = this.boneManager.getBoneByName(boneTranslations.RIGHT_WRIST.localName);
    const rightWristTwist = this.boneManager.getBoneByName(boneTranslations.RIGHT_WRIST_TWIST.localName);
    const rightIndexMCP = this.boneManager.getBoneByName(boneTranslations.RIGHT_INDEX_FINGER_1.localName);
    const rightPinkyMCP = this.boneManager.getBoneByName(boneTranslations.RIGHT_LITTLE_FINGER_1.localName);

    if (!rightElbow || !rightWrist || !rightWristTwist || !rightIndexMCP || !rightPinkyMCP) return;

    const restRightElbow = this.boneManager.getBoneRestPosition(rightElbow);
    const restRightWrist = this.boneManager.getBoneRestPosition(rightWrist);
    const restRightIndexMCP = this.boneManager.getBoneRestPosition(rightIndexMCP);
    const restRightPinkyMCP = this.boneManager.getBoneRestPosition(rightPinkyMCP);

    const poseRightElbow = landmarks[PoseLandmarkerPoint.RIGHT_ELBOW];
    const poseRightWrist = landmarks[PoseLandmarkerPoint.RIGHT_WRIST];
    const poseRightIndexMCP = handLandmarks[HandLandmarkerPoint.INDEX_FINGER_MCP];
    const poseRightPinkyMCP = handLandmarks[HandLandmarkerPoint.PINKY_MCP];

    const poseVecRightElbow = landmarkToVector(poseRightElbow);
    const poseVecRightWrist = landmarkToVector(poseRightWrist);
    const poseVecRightIndexMCP = landmarkToVector(poseRightIndexMCP);
    const poseVecRightPinkyMCP = landmarkToVector(poseRightPinkyMCP);

    const restPalmSurface = restRightIndexMCP.subtract(restRightPinkyMCP).normalize();
    const posePalmSurface = poseVecRightIndexMCP.subtract(poseVecRightPinkyMCP).normalize();

    const restForearmAxis = restRightWrist.subtract(restRightElbow).normalize();
    const poseForearmAxis = poseVecRightWrist.subtract(poseVecRightElbow).normalize();

    const twistAngle = getPhysicalPalmTwist(restForearmAxis, restPalmSurface, poseForearmAxis, posePalmSurface);
    const targetQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, twistAngle);

    rightWristTwist.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightWristTwist.rotationQuaternion,
      targetQuaternion,
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

    const rightShoulderRest = this.boneManager.getBoneRestPosition(rightShoulder);
    const rightElbowRestDir = this.boneManager.getBoneRestPosition(rightElbow).subtract(rightShoulderRest);

    if (poseRightElbow.visibility < 0.5) {
      rightArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
        rightArm.rotationQuaternion,
        rightArmDefaultQuaternion,
        0.1,
      );
      return;
    };

    const rightArmTargetQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      rightElbowRestDir.normalizeToNew(),
      poseDirRightElbow.normalizeToNew(),
      rightArmTargetQuaternion,
    );
    rightArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArm.rotationQuaternion,
      rightArmTargetQuaternion,
      0.1,
    );
  }

  guideRightArmMovementBasis(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const leftShoulder = this.boneManager.getBoneByName(boneTranslations.LEFT_SHOULDER.localName);
    const rightShoulder = this.boneManager.getBoneByName(boneTranslations.RIGHT_SHOULDER.localName);
    const rightArm = this.boneManager.getBoneByName(boneTranslations.RIGHT_ARM.localName);
    const rightElbow = this.boneManager.getBoneByName(boneTranslations.RIGHT_ELBOW.localName);
    if (!leftShoulder || !rightShoulder || !rightArm || !rightElbow) return;

    const leftShoulderRest = this.boneManager.getBoneRestPosition(leftShoulder);
    const rightShoulderRest = this.boneManager.getBoneRestPosition(rightShoulder);
    const rightElbowRest = this.boneManager.getBoneRestPosition(rightElbow);

    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseRightElbow = landmarks[PoseLandmarkerPoint.RIGHT_ELBOW];

    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecRightElbow = landmarkToVector(poseRightElbow);

    if (poseRightElbow.visibility < 0.5) {
      rightArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
        rightArm.rotationQuaternion,
        rightArmDefaultQuaternion,
        0.1,
      );
      return;
    };

    const restBasis = makeBasis(
      rightElbowRest.subtract(rightShoulderRest),
      leftShoulderRest.subtract(rightShoulderRest),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecRightElbow.subtract(poseVecRightShoulder)),
      invertYAxis(poseVecLeftShoulder.subtract(poseVecRightShoulder)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromRotationMatrixToRef(relative, rotation);
    rightArm.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArm.rotationQuaternion,
      rotation,
      0.1,
    );
  }


  guideLeftElbowMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const leftShoulder = this.boneManager.getBoneByName(boneTranslations.LEFT_SHOULDER.localName);
    const leftElbow = this.boneManager.getBoneByName(boneTranslations.LEFT_ELBOW.localName);
    const leftWrist = this.boneManager.getBoneByName(boneTranslations.LEFT_WRIST.localName);
    if (!leftShoulder || !leftElbow || !leftWrist) return;

    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];
    const poseLeftWrist = landmarks[PoseLandmarkerPoint.LEFT_WRIST];

    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecLeftElbow = landmarkToVector(poseLeftElbow);
    const poseVecLeftWrist = landmarkToVector(poseLeftWrist);
    const poseDirLeftElbow = invertYAxis(poseVecLeftElbow.subtract(poseVecLeftShoulder));
    const poseDirLeftWrist = invertYAxis(poseVecLeftWrist.subtract(poseVecLeftElbow));

    const leftShoulderRest = this.boneManager.getBoneRestPosition(leftShoulder);
    const leftElbowRest = this.boneManager.getBoneRestPosition(leftElbow);
    const leftWristRest = this.boneManager.getBoneRestPosition(leftWrist);
    const leftElbowRestDir = leftElbowRest.subtract(leftShoulderRest);
    const leftWristRestDir = leftWristRest.subtract(leftElbowRest);

    const poseLeftElbowQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      poseDirLeftElbow.normalize(),
      poseDirLeftWrist.normalize(),
      poseLeftElbowQuaternion,
    );

    const restLeftElbowQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      leftElbowRestDir.normalize(),
      leftWristRestDir.normalize(),
      restLeftElbowQuaternion,
    );

    const targetQuaternion = poseLeftElbowQuaternion.multiply(restLeftElbowQuaternion.invert());

    const euler = targetQuaternion.toEulerAngles();
    targetQuaternion.copyFrom(BABYLON.Quaternion.FromEulerAngles(0, euler.y, euler.z));
    leftElbow.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftElbow.rotationQuaternion,
      targetQuaternion,
      0.1,
    );
  }

  guideLeftElbowMovementBasis(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const leftShoulder = this.boneManager.getBoneByName(boneTranslations.LEFT_SHOULDER.localName);
    const leftElbow = this.boneManager.getBoneByName(boneTranslations.LEFT_ELBOW.localName);
    const leftWrist = this.boneManager.getBoneByName(boneTranslations.LEFT_WRIST.localName);
    if (!leftShoulder || !leftElbow || !leftWrist) return;

    const leftShoulderRest = this.boneManager.getBoneRestPosition(leftShoulder);
    const leftElbowRest = this.boneManager.getBoneRestPosition(leftElbow);
    const leftWristRest = this.boneManager.getBoneRestPosition(leftWrist);

    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];
    const poseLeftWrist = landmarks[PoseLandmarkerPoint.LEFT_WRIST];

    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecLeftElbow = landmarkToVector(poseLeftElbow);
    const poseVecLeftWrist = landmarkToVector(poseLeftWrist);

    const restBasis = makeBasis(
      leftWristRest.subtract(leftElbowRest),
      leftShoulderRest.subtract(leftElbowRest),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecLeftWrist.subtract(poseVecLeftElbow)),
      invertYAxis(poseVecLeftShoulder.subtract(poseVecLeftElbow)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromRotationMatrixToRef(relative, rotation);
    leftElbow.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftElbow.rotationQuaternion,
      rotation,
      0.1,
    );
  }

  guideRightElbowMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const rightShoulder = this.boneManager.getBoneByName(boneTranslations.RIGHT_SHOULDER.localName);
    const rightElbow = this.boneManager.getBoneByName(boneTranslations.RIGHT_ELBOW.localName);
    const rightWrist = this.boneManager.getBoneByName(boneTranslations.RIGHT_WRIST.localName);
    if (!rightShoulder || !rightElbow || !rightWrist) return;

    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseRightElbow = landmarks[PoseLandmarkerPoint.RIGHT_ELBOW];
    const poseRightWrist = landmarks[PoseLandmarkerPoint.RIGHT_WRIST];

    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecRightElbow = landmarkToVector(poseRightElbow);
    const poseVecRightWrist = landmarkToVector(poseRightWrist);
    const poseDirRightElbow = invertYAxis(poseVecRightElbow.subtract(poseVecRightShoulder));
    const poseDirRightWrist = invertYAxis(poseVecRightWrist.subtract(poseVecRightElbow));

    const rightShoulderRest = this.boneManager.getBoneRestPosition(rightShoulder);
    const rightElbowRest = this.boneManager.getBoneRestPosition(rightElbow);
    const rightWristRest = this.boneManager.getBoneRestPosition(rightWrist);
    const rightElbowRestDir = rightElbowRest.subtract(rightShoulderRest);
    const rightWristRestDir = rightWristRest.subtract(rightElbowRest);

    const poseRightElbowQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      poseDirRightElbow.normalize(),
      poseDirRightWrist.normalize(),
      poseRightElbowQuaternion,
    );

    const restRightElbowQuaternion = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(
      rightElbowRestDir.normalize(),
      rightWristRestDir.normalize(),
      restRightElbowQuaternion,
    );

    const targetQuaternion = poseRightElbowQuaternion.multiply(restRightElbowQuaternion.invert());

    const euler = targetQuaternion.toEulerAngles();
    targetQuaternion.copyFrom(BABYLON.Quaternion.FromEulerAngles(0, euler.y, euler.z));
    rightElbow.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightElbow.rotationQuaternion,
      targetQuaternion,
      0.1,
    );
  }

  guideRightElbowMovementBasis(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const rightShoulder = this.boneManager.getBoneByName(boneTranslations.RIGHT_SHOULDER.localName);
    const rightElbow = this.boneManager.getBoneByName(boneTranslations.RIGHT_ELBOW.localName);
    const rightWrist = this.boneManager.getBoneByName(boneTranslations.RIGHT_WRIST.localName);
    if (!rightShoulder || !rightElbow || !rightWrist) return;

    const rightShoulderRest = this.boneManager.getBoneRestPosition(rightShoulder);
    const rightElbowRest = this.boneManager.getBoneRestPosition(rightElbow);
    const rightWristRest = this.boneManager.getBoneRestPosition(rightWrist);

    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseRightElbow = landmarks[PoseLandmarkerPoint.RIGHT_ELBOW];
    const poseRightWrist = landmarks[PoseLandmarkerPoint.RIGHT_WRIST];

    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecRightElbow = landmarkToVector(poseRightElbow);
    const poseVecRightWrist = landmarkToVector(poseRightWrist);

    const restBasis = makeBasis(
      rightWristRest.subtract(rightElbowRest),
      rightShoulderRest.subtract(rightElbowRest),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecRightWrist.subtract(poseVecRightElbow)),
      invertYAxis(poseVecRightShoulder.subtract(poseVecRightElbow)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromRotationMatrixToRef(relative, rotation);
    rightElbow.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightElbow.rotationQuaternion,
      rotation,
      0.1,
    );
  }
}