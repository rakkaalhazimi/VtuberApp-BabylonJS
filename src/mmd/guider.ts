import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import type { HandLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

import { HandLandmarkerPoint, HandLandmarkerEstimation } from '@/computer-vision/hand-landmarker';
import { PoseLandmarkerPoint } from '@/computer-vision/pose-estimation';
import { MMDBoneManager } from '@/mmd/bone-manager';
import { boneTranslations } from '@/mmd/translation';
import {
  landmarkToVector,
  invertYAxis,
  makeBasis,
  getPhysicalPalmTwist,
  angleBetweenVectors3D,
  getArmTwistAngle,
  projectToPlane,
  invertZAxis,
  parseLandmark,
  angleBetweenVectorsNormal,
} from '@/utils';



const NEUTRAL_SHOULDER_Z = -0.1;
const ANGLE_THRESHOLD_RADIANS = BABYLON.Angle.FromDegrees(1.5).radians();

const leftArmDefaultQuaternion = BABYLON.Quaternion.FromEulerAngles(0, 0, -0.6);
const rightArmDefaultQuaternion = BABYLON.Quaternion.FromEulerAngles(0, 0, 0.6);

// Head rotation limits (radians) to avoid unnatural MMD poses
const HEAD_PITCH_LIMIT = BABYLON.Angle.FromDegrees(30).radians();
const HEAD_YAW_LIMIT = BABYLON.Angle.FromDegrees(40).radians();
const HEAD_ROLL_LIMIT = BABYLON.Angle.FromDegrees(25).radians();


export class MMDMovementGuider {

  private boneManager: MMDBoneManager;

  private upperBodyPitch: number = 0;
  private upperBodyYaw: number = 0;
  private upperBodyRoll: number = 0;

  private headPitch: number = 0;
  private headYaw: number = 0;
  private headRoll: number = 0;
  // Neutral nose-drop (nose.y - midEar.y, raw MediaPipe coords where +y = down).
  // Calibrated on first valid frame; pitch is measured relative to it.
  private neutralNoseDrop: number | null = null;

  constructor(public model: BABYLONMMD.MmdModel) {
    this.boneManager = new MMDBoneManager(model);
  }

  smooth(oldValue: number, newValue: number) {
    return (newValue - oldValue) * 0.05;
  }

  guideHeadMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const head = this.boneManager.getBoneByName(boneTranslations.HEAD.localName);
    if (!head) return;

    const poseNose = parseLandmark(landmarks[PoseLandmarkerPoint.NOSE]);
    const poseLeftEar = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_EAR]);
    const poseRightEar = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_EAR]);
    const poseMouthLeft = parseLandmark(landmarks[PoseLandmarkerPoint.MOUTH_LEFT]);
    const poseMouthRight = parseLandmark(landmarks[PoseLandmarkerPoint.MOUTH_RIGHT]);

    const earVisibility = ((poseLeftEar.visibility ?? 1) + (poseRightEar.visibility ?? 1)) / 2;
    const noseVisibility = poseNose.visibility ?? 1;
    const mouthVisibility = ((poseMouthLeft.visibility ?? 1) + (poseMouthRight.visibility ?? 1)) / 2;
    if (earVisibility < 0.5 && noseVisibility < 0.5) {
      // Face lost: ease back to neutral
      this.headPitch *= 0.9;
      this.headYaw *= 0.9;
      this.headRoll *= 0.9;
      const neutralQ = BABYLON.Quaternion.Identity();
      head.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
        head.bone.rotationQuaternion,
        neutralQ,
        0.1,
      );
      return;
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
      this.headYaw += this.smooth(this.headYaw, yawTarget);
    }
    if (earVisibility < 0.5) {
      this.headYaw *= 0.9;
    }
    const yawQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 1, 0),
      this.headYaw,
    );

    // Pitch (rotation around horizontal X axis, nodding up/down)
    // Raw MediaPipe +y points down, so noseDrop > 0 at neutral and grows when looking down.
    // Calibrate neutral on first valid frame, then map the delta to a pitch angle.
    const noseDrop = poseNose.y - poseVecMidEar.y;
    if (this.neutralNoseDrop === null && noseVisibility >= 0.5) {
      this.neutralNoseDrop = noseDrop;
    }
    const neutralDrop = this.neutralNoseDrop ?? noseDrop;
    // Looking down increases noseDrop -> negative X rotation nods the MMD head down
    // (model faces -Z, so -X tips the face downward).
    const pitchTarget = BABYLON.Scalar.Clamp(
      -((noseDrop - neutralDrop) / earDist) * 2.0,
      -HEAD_PITCH_LIMIT,
      HEAD_PITCH_LIMIT,
    );
    if (Math.abs(pitchTarget) > ANGLE_THRESHOLD_RADIANS) {
      this.headPitch += this.smooth(this.headPitch, pitchTarget);
    }
    if (noseVisibility < 0.5) {
      this.headPitch *= 0.9;
    }
    const pitchQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(1, 0, 0),
      this.headPitch,
    );

    // Roll (rotation around forward Z axis, sideways tilt)
    // Same pattern as upper body: up-vector of the face, atan2(x, y) is ~0 at neutral.
    const faceUp = invertYAxis(poseVecMidEar.subtract(poseVecMidMouth));
    const rollTarget = BABYLON.Scalar.Clamp(
      Math.atan2(faceUp.x, Math.max(faceUp.y, 1e-4)),
      -HEAD_ROLL_LIMIT,
      HEAD_ROLL_LIMIT,
    );
    if (Math.abs(rollTarget) > ANGLE_THRESHOLD_RADIANS) {
      this.headRoll += this.smooth(this.headRoll, rollTarget);
    }
    if (mouthVisibility < 0.5) {
      this.headRoll *= 0.9;
    }
    const rollQ = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(0, 0, 1),
      this.headRoll,
    );

    const targetQuaternion = pitchQ.multiply(yawQ).multiply(rollQ);
    head.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      head.bone.rotationQuaternion,
      targetQuaternion,
      0.15,
    );
  }

  guideUpperBodyMovement(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;
    const upperBody = this.boneManager.getBoneByName(boneTranslations.UPPER_BODY.localName);
    if (!upperBody) return;

    const poseLeftHip = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_HIP]);
    const poseRightHip = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_HIP]);
    const poseLeftShoulder = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_SHOULDER]);
    const poseRightShoulder = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER]);

    const poseVecMidHip = BABYLON.Vector3.Center(poseLeftHip.position, poseRightHip.position);
    const poseVecMidShoulder = BABYLON.Vector3.Center(poseLeftShoulder.position, poseRightShoulder.position);
    poseVecMidShoulder.z -= NEUTRAL_SHOULDER_Z;  // Subtracted by neutral shoulder z position

    // Pitch (Rotation around horizontal axis)
    const bodyLean = poseVecMidShoulder.subtract(poseVecMidHip);
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
    const bodyTwist = poseLeftShoulder.position.subtract(poseRightShoulder.position);
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
    const bodyTilt = poseVecMidShoulder.subtract(poseVecMidHip);
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
    upperBody.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      upperBody.bone.rotationQuaternion,
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

    const poseLeftShoulder = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_SHOULDER]);
    const poseLeftElbow = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_ELBOW]);

    const poseDirLeftElbow = poseLeftElbow.position.subtract(poseLeftShoulder.position);

    const leftElbowRestDir = leftElbow.restPosition.subtract(leftShoulder.restPosition);

    if (poseLeftElbow.visibility < 0.5) {
      leftArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
        leftArm.bone.rotationQuaternion,
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
    leftArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArm.bone.rotationQuaternion,
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

    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];

    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecLeftElbow = landmarkToVector(poseLeftElbow);

    if (poseLeftElbow.visibility < 0.5) {
      leftArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
        leftArm.bone.rotationQuaternion,
        leftArmDefaultQuaternion,
        0.1,
      );
      return;
    };

    const restBasis = makeBasis(
      leftElbow.restPosition.subtract(leftShoulder.restPosition),
      rightShoulder.restPosition.subtract(leftShoulder.restPosition),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecLeftElbow.subtract(poseVecLeftShoulder)),
      invertYAxis(poseVecRightShoulder.subtract(poseVecLeftShoulder)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromRotationMatrixToRef(relative, rotation);
    leftArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArm.bone.rotationQuaternion,
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

    const poseLeftElbow = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_ELBOW]);
    const poseLeftWrist = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_WRIST]);
    const poseLeftIndexMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_MCP]);
    const poseLeftPinkyMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_MCP]);

    const restPalmSurface = leftIndexMCP.restPosition.subtract(leftPinkyMCP.restPosition).normalize();
    const posePalmSurface = poseLeftIndexMCP.position.subtract(poseLeftPinkyMCP.position).normalize();

    const restForearmAxis = leftWrist.restPosition.subtract(leftElbow.restPosition).normalize();
    const poseForearmAxis = poseLeftWrist.position.subtract(poseLeftElbow.position).normalize();

    const twistAngle = getPhysicalPalmTwist(restForearmAxis, restPalmSurface, poseForearmAxis, posePalmSurface);
    const targetQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, -twistAngle); // Invert the twist angle

    leftWristTwist.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftWristTwist.bone.rotationQuaternion,
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

    const poseRightElbow = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_ELBOW]);
    const poseRightWrist = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_WRIST]);
    const poseRightIndexMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_MCP]);
    const poseRightPinkyMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_MCP]);

    const restPalmSurface = rightIndexMCP.restPosition.subtract(rightPinkyMCP.restPosition).normalize();
    const posePalmSurface = poseRightIndexMCP.position.subtract(poseRightPinkyMCP.position).normalize();

    const restForearmAxis = rightWrist.restPosition.subtract(rightElbow.restPosition).normalize();
    const poseForearmAxis = poseRightWrist.position.subtract(poseRightElbow.position).normalize();

    const twistAngle = getPhysicalPalmTwist(restForearmAxis, restPalmSurface, poseForearmAxis, posePalmSurface);
    const targetQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, twistAngle);

    rightWristTwist.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightWristTwist.bone.rotationQuaternion,
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

    const poseRightShoulder = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER]);
    const poseRightElbow = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_ELBOW]);

    const poseDirRightElbow = poseRightElbow.position.subtract(poseRightShoulder.position);

    const rightElbowRestDir = rightElbow.restPosition.subtract(rightShoulder.restPosition);

    if (poseRightElbow.visibility < 0.5) {
      rightArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
        rightArm.bone.rotationQuaternion,
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
    rightArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArm.bone.rotationQuaternion,
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

    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseRightElbow = landmarks[PoseLandmarkerPoint.RIGHT_ELBOW];

    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecRightElbow = landmarkToVector(poseRightElbow);

    if (poseRightElbow.visibility < 0.5) {
      rightArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
        rightArm.bone.rotationQuaternion,
        rightArmDefaultQuaternion,
        0.1,
      );
      return;
    };

    const restBasis = makeBasis(
      rightElbow.restPosition.subtract(rightShoulder.restPosition),
      leftShoulder.restPosition.subtract(rightShoulder.restPosition),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecRightElbow.subtract(poseVecRightShoulder)),
      invertYAxis(poseVecLeftShoulder.subtract(poseVecRightShoulder)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromRotationMatrixToRef(relative, rotation);
    rightArm.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArm.bone.rotationQuaternion,
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

    const leftElbowRestDir = leftElbow.restPosition.subtract(leftShoulder.restPosition);
    const leftWristRestDir = leftWrist.restPosition.subtract(leftElbow.restPosition);

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
    leftElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftElbow.bone.rotationQuaternion,
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

    const poseLeftShoulder = landmarks[PoseLandmarkerPoint.LEFT_SHOULDER];
    const poseLeftElbow = landmarks[PoseLandmarkerPoint.LEFT_ELBOW];
    const poseLeftWrist = landmarks[PoseLandmarkerPoint.LEFT_WRIST];

    const poseVecLeftShoulder = landmarkToVector(poseLeftShoulder);
    const poseVecLeftElbow = landmarkToVector(poseLeftElbow);
    const poseVecLeftWrist = landmarkToVector(poseLeftWrist);

    // const poseVecLeftShoulder = new BABYLON.Vector3(0.0993, 17.6241, 0.3900);
    // const poseVecLeftElbow = new BABYLON.Vector3(3.5310, 15.5611, 0.4285);
    // const poseVecLeftWrist = new BABYLON.Vector3(3.5310, 15.5611, -3.3329);

    const restBasis = makeBasis(
      leftWrist.restPosition.subtract(leftElbow.restPosition),
      leftShoulder.restPosition.subtract(leftElbow.restPosition),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecLeftWrist.subtract(poseVecLeftElbow)),
      invertYAxis(poseVecLeftShoulder.subtract(poseVecLeftElbow)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = BABYLON.Quaternion.FromRotationMatrixToRef(relative, new BABYLON.Quaternion());
    const euler = rotation.toEulerAngles();
    const rollDeg = BABYLON.Tools.ToDegrees(euler.z);

    leftElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftElbow.bone.rotationQuaternion,
      BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -rollDeg),
      0.1,
    );
  }

  guideLeftElbowMovementHinge(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;

    const leftShoulder = this.boneManager.getBoneByName(boneTranslations.LEFT_SHOULDER.localName);
    const leftElbow = this.boneManager.getBoneByName(boneTranslations.LEFT_ELBOW.localName);
    const leftWrist = this.boneManager.getBoneByName(boneTranslations.LEFT_WRIST.localName);
    const leftArmTwist = this.boneManager.getBoneByName(boneTranslations.LEFT_ARM_TWIST.localName);
    if (!leftShoulder || !leftElbow || !leftWrist || !leftArmTwist) return;

    const restUpperArm = leftElbow.restPosition.subtract(leftShoulder.restPosition).normalize();
    const restLowerArm = leftWrist.restPosition.subtract(leftElbow.restPosition).normalize();

    const side = restUpperArm.clone();
    const forward = side.cross(restLowerArm);
    const restNormal = invertZAxis(side.cross(forward)); // up
    // console.log('Rest normal: ', restNormal.toString());

    const poseLeftShoulder = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_SHOULDER]);
    const poseLeftElbow = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_ELBOW]);
    const poseLeftWrist = parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_WRIST]);

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
    const targetHingeQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), bendAngleRad);

    leftElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftElbow.bone.rotationQuaternion,
      targetHingeQuaternion,
      0.1,
    );

    const targetTwistQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), poseTwistAngle);
    leftArmTwist.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftArmTwist.bone.rotationQuaternion,
      targetTwistQuaternion,
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

    const rightElbowRestDir = rightElbow.restPosition.subtract(rightShoulder.restPosition);
    const rightWristRestDir = rightWrist.restPosition.subtract(rightElbow.restPosition);

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
    rightElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightElbow.bone.rotationQuaternion,
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

    const poseRightShoulder = landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER];
    const poseRightElbow = landmarks[PoseLandmarkerPoint.RIGHT_ELBOW];
    const poseRightWrist = landmarks[PoseLandmarkerPoint.RIGHT_WRIST];

    const poseVecRightShoulder = landmarkToVector(poseRightShoulder);
    const poseVecRightElbow = landmarkToVector(poseRightElbow);
    const poseVecRightWrist = landmarkToVector(poseRightWrist);

    const restBasis = makeBasis(
      rightWrist.restPosition.subtract(rightElbow.restPosition),
      rightShoulder.restPosition.subtract(rightElbow.restPosition),
    );

    const poseBasis = makeBasis(
      invertYAxis(poseVecRightWrist.subtract(poseVecRightElbow)),
      invertYAxis(poseVecRightShoulder.subtract(poseVecRightElbow)),
    );

    const relative = restBasis.clone().invert().multiply(poseBasis);

    const rotation = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromRotationMatrixToRef(relative, rotation);
    rightElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightElbow.bone.rotationQuaternion,
      rotation,
      0.1,
    );
  }

  guideRightElbowMovementHinge(result: PoseLandmarkerResult) {
    const landmarks = result.worldLandmarks[0];
    if (!landmarks) return;

    const rightShoulder = this.boneManager.getBoneByName(boneTranslations.RIGHT_SHOULDER.localName);
    const rightElbow = this.boneManager.getBoneByName(boneTranslations.RIGHT_ELBOW.localName);
    const rightWrist = this.boneManager.getBoneByName(boneTranslations.RIGHT_WRIST.localName);
    const rightArmTwist = this.boneManager.getBoneByName(boneTranslations.RIGHT_ARM_TWIST.localName);
    if (!rightShoulder || !rightElbow || !rightWrist || !rightArmTwist) return;

    const restUpperArm = rightElbow.restPosition.subtract(rightShoulder.restPosition).normalize();
    const restLowerArm = rightWrist.restPosition.subtract(rightElbow.restPosition).normalize();

    const side = restUpperArm.clone();
    const forward = side.cross(restLowerArm);
    const restNormal = invertZAxis(side.cross(forward)); // up

    const poseRightShoulder = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER]);
    const poseRightElbow = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_ELBOW]);
    const poseRightWrist = parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_WRIST]);

    const poseUpperArm = poseRightElbow.position.subtract(poseRightShoulder.position).normalize();
    const poseLowerArm = poseRightWrist.position.subtract(poseRightElbow.position).normalize();

    const restAngle = angleBetweenVectors3D(rightShoulder.restPosition, rightElbow.restPosition, rightWrist.restPosition);
    const poseAngle = angleBetweenVectors3D(poseRightShoulder.position, poseRightElbow.position, poseRightWrist.position, true);
    const poseTwistAngle = getArmTwistAngle(poseUpperArm, poseLowerArm, restUpperArm, restNormal);

    // 1. Calculate how much the elbow is bent relative to rest (0 when straight/extended)
    let bendAngleRad = restAngle - poseAngle;

    // 2. Clamp to 1-way bending: prevents hyper-extension (< 0) and limits maximum flexion to near PI rad (~170°)
    const MAX_FLEXION = Math.PI - 0.17; // ~170 degrees max physical bend limit
    bendAngleRad = Math.max(0, Math.min(bendAngleRad, MAX_FLEXION));

    // 3. Apply single Z-axis hinge rotation (mirrored vs left, hence negated)
    // Note: If the elbow bends in the wrong direction, invert the sign (bendAngleRad)
    const targetHingeQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -bendAngleRad);

    rightElbow.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightElbow.bone.rotationQuaternion,
      targetHingeQuaternion,
      0.1,
    );

    const targetTwistQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), -poseTwistAngle);
    rightArmTwist.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      rightArmTwist.bone.rotationQuaternion,
      targetTwistQuaternion,
      0.1,
    );
  }

  guideLeftFingersMovement(hand: HandLandmarkerResult) {
    const handLandmarks = HandLandmarkerEstimation.GetLeftHand(hand);
    if (!handLandmarks) return;

    const leftWrist = this.boneManager.getBoneByName(boneTranslations.LEFT_WRIST.localName);
    const leftIndexMCP = this.boneManager.getBoneByName(boneTranslations.LEFT_INDEX_FINGER_1.localName);
    const leftIndexPIP = this.boneManager.getBoneByName(boneTranslations.LEFT_INDEX_FINGER_2.localName);
    const leftIndexDIP = this.boneManager.getBoneByName(boneTranslations.LEFT_INDEX_FINGER_3.localName);
    const leftIndexTIP = this.boneManager.getBoneByName(boneTranslations.LEFT_INDEX_FINGER_TIP.localName);

    const leftMiddleMCP = this.boneManager.getBoneByName(boneTranslations.LEFT_MIDDLE_FINGER_1.localName);
    const leftMiddlePIP = this.boneManager.getBoneByName(boneTranslations.LEFT_MIDDLE_FINGER_2.localName);
    const leftMiddleDIP = this.boneManager.getBoneByName(boneTranslations.LEFT_MIDDLE_FINGER_3.localName);
    const leftMiddleTIP = this.boneManager.getBoneByName(boneTranslations.LEFT_MIDDLE_FINGER_TIP.localName);

    const leftRingMCP = this.boneManager.getBoneByName(boneTranslations.LEFT_RING_FINGER_1.localName);
    const leftRingPIP = this.boneManager.getBoneByName(boneTranslations.LEFT_RING_FINGER_2.localName);
    const leftRingDIP = this.boneManager.getBoneByName(boneTranslations.LEFT_RING_FINGER_3.localName);
    const leftRingTIP = this.boneManager.getBoneByName(boneTranslations.LEFT_RING_FINGER_TIP.localName);

    const leftPinkyMCP = this.boneManager.getBoneByName(boneTranslations.LEFT_LITTLE_FINGER_1.localName);
    const leftPinkyPIP = this.boneManager.getBoneByName(boneTranslations.LEFT_LITTLE_FINGER_2.localName);
    const leftPinkyDIP = this.boneManager.getBoneByName(boneTranslations.LEFT_LITTLE_FINGER_3.localName);
    const leftPinkyTIP = this.boneManager.getBoneByName(boneTranslations.LEFT_LITTLE_FINGER_TIP.localName);

    if (
      !leftWrist
      || !leftIndexMCP || !leftMiddleMCP || !leftRingMCP || !leftPinkyMCP
      || !leftIndexPIP || !leftMiddlePIP || !leftRingPIP || !leftPinkyPIP
      || !leftIndexDIP || !leftMiddleDIP || !leftRingDIP || !leftPinkyDIP
      || !leftIndexTIP || !leftMiddleTIP || !leftRingTIP || !leftPinkyTIP
    ) return;

    const poseLeftWrist = parseLandmark(handLandmarks[HandLandmarkerPoint.WRIST]);
    const poseLeftIndexMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_MCP]);
    const poseLeftIndexDIP = parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_DIP]);
    const poseLeftIndexPIP = parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_PIP]);
    const poseLeftIndexTIP = parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_TIP]);

    const poseLeftMiddleMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_MCP]);
    const poseLeftMiddleDIP = parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_DIP]);
    const poseLeftMiddlePIP = parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_PIP]);
    const poseLeftMiddleTIP = parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_TIP]);

    const poseLeftRingMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_MCP]);
    const poseLeftRingDIP = parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_DIP]);
    const poseLeftRingPIP = parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_PIP]);
    const poseLeftRingTIP = parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_TIP]);

    const poseLeftPinkyMCP = parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_MCP]);
    const poseLeftPinkyDIP = parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_DIP]);
    const poseLeftPinkyPIP = parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_PIP]);
    const poseLeftPinkyTIP = parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_TIP]);

    const indexPIPAngle = Math.PI - 0.2 - angleBetweenVectorsNormal(
      poseLeftIndexDIP.position,
      poseLeftIndexPIP.position,
      poseLeftIndexMCP.position,
    );
    const indexPIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -indexPIPAngle);
    leftIndexPIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftIndexPIP.bone.rotationQuaternion,
      indexPIPRotation,
      0.1,
    );

    const indexDIPAngle = Math.PI - 0.2 - angleBetweenVectorsNormal(
      poseLeftIndexTIP.position,
      poseLeftIndexDIP.position,
      poseLeftIndexPIP.position,
    );
    const indexDIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -indexDIPAngle);
    leftIndexDIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftIndexDIP.bone.rotationQuaternion,
      indexDIPRotation,
      0.1,
    );

    const indexMCPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftIndexPIP.position,
      poseLeftIndexMCP.position,
      poseLeftWrist.position,
    );
    // console.log('angle: ', indexMCPAngle);
    const indexMCPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -indexMCPAngle);
    leftIndexMCP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftIndexMCP.bone.rotationQuaternion,
      indexMCPRotation,
      0.1,
    );

    const middlePIPAngle = Math.PI - angleBetweenVectors3D(
      poseLeftMiddleDIP.position,
      poseLeftMiddlePIP.position,
      poseLeftMiddleMCP.position,
    );
    const middlePIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -middlePIPAngle);
    leftMiddlePIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftMiddlePIP.bone.rotationQuaternion,
      middlePIPRotation,
      0.1,
    );

    const middleDIPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftMiddleTIP.position,
      poseLeftMiddleDIP.position,
      poseLeftMiddlePIP.position,
    );
    const middleDIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -middleDIPAngle);
    leftMiddleDIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftMiddleDIP.bone.rotationQuaternion,
      middleDIPRotation,
      0.1,
    );

    const middleMCPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftMiddlePIP.position,
      poseLeftMiddleMCP.position,
      poseLeftWrist.position,
    );
    const middleMCPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -middleMCPAngle);
    leftMiddleMCP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftMiddleMCP.bone.rotationQuaternion,
      middleMCPRotation,
      0.1,
    );

    // ---- Ring ----
    const ringPIPAngle = Math.PI - angleBetweenVectors3D(
      poseLeftRingDIP.position,
      poseLeftRingPIP.position,
      poseLeftRingMCP.position,
    );
    const ringPIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -ringPIPAngle);
    leftRingPIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftRingPIP.bone.rotationQuaternion,
      ringPIPRotation,
      0.1,
    );

    const ringDIPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftRingTIP.position,
      poseLeftRingDIP.position,
      poseLeftRingPIP.position,
    );
    const ringDIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -ringDIPAngle);
    leftRingDIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftRingDIP.bone.rotationQuaternion,
      ringDIPRotation,
      0.1,
    );

    const ringMCPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftRingPIP.position,
      poseLeftRingMCP.position,
      poseLeftWrist.position,
    );
    const ringMCPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -ringMCPAngle);
    leftRingMCP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftRingMCP.bone.rotationQuaternion,
      ringMCPRotation,
      0.1,
    );

    // ---- Pinky ----
    const pinkyPIPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftPinkyDIP.position,
      poseLeftPinkyPIP.position,
      poseLeftPinkyMCP.position,
    );
    const pinkyPIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -pinkyPIPAngle);
    leftPinkyPIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftPinkyPIP.bone.rotationQuaternion,
      pinkyPIPRotation,
      0.1,
    );

    const pinkyDIPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftPinkyTIP.position,
      poseLeftPinkyDIP.position,
      poseLeftPinkyPIP.position,
    );
    const pinkyDIPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -pinkyDIPAngle);
    leftPinkyDIP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftPinkyDIP.bone.rotationQuaternion,
      pinkyDIPRotation,
      0.1,
    );

    const pinkyMCPAngle = Math.PI - angleBetweenVectorsNormal(
      poseLeftPinkyPIP.position,
      poseLeftPinkyMCP.position,
      poseLeftWrist.position,
    );
    const pinkyMCPRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Forward(), -pinkyMCPAngle);
    leftPinkyMCP.bone.rotationQuaternion = BABYLON.Quaternion.Slerp(
      leftPinkyMCP.bone.rotationQuaternion,
      pinkyMCPRotation,
      0.1,
    );
  }
}