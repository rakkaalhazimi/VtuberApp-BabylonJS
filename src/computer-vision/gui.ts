import dat from "dat.gui";
import type { PoseLandmarkerEstimation } from "./pose-estimation";



export class ComputerVisionGUI {

  private gui: dat.GUI;

  constructor(private poseEstimation: PoseLandmarkerEstimation) {
    this.gui = new dat.GUI();
  }

  createPoseEstimationGUI() {
    const options = {
      enablePoseEstimation: this.poseEstimation.isEnabled,
    };
    this.gui.add(options, 'enablePoseEstimation').onChange((value) => value
      ? this.poseEstimation.enablePoseLandmarks()
      : this.poseEstimation.disablePoseLandmarks());
  }
}