import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import * as Kalidokit from 'kalidokit';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

import { PoseMMDGuider } from '@/animation/poseMMDGuider';
import { PoseMMDRetargeter } from '@/animation/poseMMDRetargeter';
import { createPoseLandmarkState } from '@/computer-vision/pose-landmark-state';
import { createMMDBoneState } from '@/mmd/mmd-bone-state';
import { createMMDMorphController } from '@/mmd/morph-controller';


export class PoseMMDAnimation {

  public poseRetargeter: PoseMMDRetargeter | null = null;
  public poseGuider: PoseMMDGuider | null = null;
  public mmdModel: BABYLONMMD.MmdModel | null = null;

  constructor() { }

  useMmdModel(mmdModel: BABYLONMMD.MmdModel | null) {
    if (!mmdModel) return;
    const boneState = createMMDBoneState(mmdModel);
    const morphController = createMMDMorphController(mmdModel);
    this.poseRetargeter = new PoseMMDRetargeter(boneState);
    this.poseGuider = new PoseMMDGuider(boneState, morphController);

    // Lower arm at start
    // this.poseRetargeter.retargetLeftArm();
    // this.poseRetargeter.retargetRightArm();
    // this.poseGuider.guideLeftArm(this.poseRetargeter.state);
    // this.poseGuider.guideRightArm(this.poseRetargeter.state);
  }

  retargetFaceKalido(faceRig: Kalidokit.TFace) {
    this.poseRetargeter?.retargetEyeBlinkKalido(faceRig);
    this.poseRetargeter?.retargetEyeMovement(faceRig);
    this.poseRetargeter?.retargetHeadKalido(faceRig);
    this.poseRetargeter?.retargetMouthKalido(faceRig);
  }

  guideFaceKalido() {
    if (!this.poseRetargeter) return;
    this.poseGuider?.guideEyeBlinkKalido(this.poseRetargeter.state);
    this.poseGuider?.guideEyeMovementKalido(this.poseRetargeter.state);
    this.poseGuider?.guideMouthKalido(this.poseRetargeter.state);
    this.poseGuider?.guideHead(this.poseRetargeter.state);
  }

  retargetPose(poseResult: PoseLandmarkerResult) {
    const poseState = createPoseLandmarkState(poseResult);
    this.poseRetargeter?.updatePoseState(poseState);
    this.poseRetargeter?.retargetUpperBody();
    this.poseRetargeter?.retargetLeftArm();
    this.poseRetargeter?.retargetRightArm();
    this.poseRetargeter?.retargetLeftElbow();
    this.poseRetargeter?.retargetRightElbow();
  }

  guidePose() {
    if (!this.poseRetargeter) return;
    this.poseGuider?.guideUpperBody(this.poseRetargeter.state);
    this.poseGuider?.guideLeftArm(this.poseRetargeter.state);
    this.poseGuider?.guideRightArm(this.poseRetargeter.state);
    this.poseGuider?.guideLeftArmTwist(this.poseRetargeter.state);
    this.poseGuider?.guideLeftElbowHinge(this.poseRetargeter.state);
    this.poseGuider?.guideRightArmTwist(this.poseRetargeter.state);
    this.poseGuider?.guideRightElbowHinge(this.poseRetargeter.state);
  }

  retargetHandKalido(
    handRigL: Kalidokit.THand<Kalidokit.Side> | undefined,
    handRigR: Kalidokit.THand<Kalidokit.Side> | undefined,
  ) {
    if (handRigL) this.poseRetargeter?.retargetLeftHandKalido(handRigL);
    if (handRigR) this.poseRetargeter?.retargetRightHandKalido(handRigR);
  }

  guideHandKalido() {
    if (!this.poseRetargeter) return;
    this.poseGuider?.guideLeftHandKalido(this.poseRetargeter.state);
    this.poseGuider?.guideRightHandKalido(this.poseRetargeter.state);
  }

}