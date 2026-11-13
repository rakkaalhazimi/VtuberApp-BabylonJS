import dat from 'dat.gui';


import type { FaceLandmarkerWorker } from '@/worker/face-landmarker-worker';
import type { HandLandmarkerWorker } from '@/worker/hand-landmarker-worker';
import type { PoseEstimationWorker } from '@/worker/pose-estimation-worker';


export class PoseGUI {
  private mainFolder: dat.GUI;

  constructor(private gui: dat.GUI = new dat.GUI()) {
    this.mainFolder = this.gui.addFolder('Pose');
    this.mainFolder.open();
  }

  createPoseEstimationGUI(poseWorker: PoseEstimationWorker, folder: dat.GUI = this.mainFolder) {
    const options = {
      enablePoseEstimation: poseWorker.isEnabled,
    };
    folder.add(options, 'enablePoseEstimation').onChange((value: boolean) => value
      ? poseWorker.enableWorker()
      : poseWorker.disableWorker());
  }

  createHandEstimationGUI(handWorker: HandLandmarkerWorker, folder: dat.GUI = this.mainFolder) {
    const options = {
      enableHandEstimation: handWorker.isEnabled,
    };
    folder.add(options, 'enableHandEstimation').onChange((value: boolean) => value
      ? handWorker.enableWorker()
      : handWorker.disableWorker());
  }

  createFaceEstimationGUI(faceWorker: FaceLandmarkerWorker, folder: dat.GUI = this.mainFolder) {
    const options = {
      enableFaceEstimation: faceWorker.isEnabled,
    };
    folder.add(options, 'enableFaceEstimation').onChange((value: boolean) => value
      ? faceWorker.enableWorker()
      : faceWorker.disableWorker());
  }
}