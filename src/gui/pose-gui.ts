import dat from 'dat.gui';


import type { FaceLandmarkerWorker } from '@/worker/face-landmarker-worker';
import type { HandLandmarkerWorker } from '@/worker/hand-landmarker-worker';
import type { PoseEstimationWorker } from '@/worker/pose-estimation-worker';


export class PoseGUI {
  private mainFolder: dat.GUI;

  constructor(
    private poseWorker: PoseEstimationWorker,
    private handWorker: HandLandmarkerWorker,
    private faceWorker: FaceLandmarkerWorker,
    private gui: dat.GUI = new dat.GUI(),
  ) {
    this.mainFolder = this.gui.addFolder('Pose');
  }

  createPoseEstimationGUI(folder: dat.GUI = this.gui) {
    const options = {
      enablePoseEstimation: this.poseWorker.isEnabled,
    };
    folder.add(options, 'enablePoseEstimation').onChange((value: boolean) => value
      ? this.poseWorker.enableWorker()
      : this.poseWorker.disableWorker());
  }

  createHandEstimationGUI(folder: dat.GUI = this.gui) {
    const options = {
      enableHandEstimation: this.handWorker.isEnabled,
    };
    folder.add(options, 'enableHandEstimation').onChange((value: boolean) => value
      ? this.handWorker.enableWorker()
      : this.handWorker.disableWorker());
  }

  createFaceEstimationGUI(folder: dat.GUI = this.gui) {
    const options = {
      enableFaceEstimation: this.faceWorker.isEnabled,
    };
    folder.add(options, 'enableFaceEstimation').onChange((value: boolean) => value
      ? this.faceWorker.enableWorker()
      : this.faceWorker.disableWorker());
  }

  createPoseGUI(folder: dat.GUI = this.mainFolder) {
    this.createFaceEstimationGUI(folder);
    this.createPoseEstimationGUI(folder);
    this.createHandEstimationGUI(folder);
    folder.open();
  }
}