import dat from 'dat.gui';

import type { VideoCamera } from '@/video/video';
import type { HandLandmarkerWorker } from '@/worker/hand-landmarker-worker';
import type { PoseEstimationWorker } from '@/worker/pose-estimation-worker';



export class ControlGUI {
  private gui: dat.GUI;

  constructor(
    public videoCamera: VideoCamera,
    private poseWorker: PoseEstimationWorker,
    private handWorker: HandLandmarkerWorker,
  ) {
    this.gui = new dat.GUI();
  }

  createEnableCameraGUI(folder: dat.GUI = this.gui) {
    const options = {
      enableCamera: this.videoCamera.isEnable,
    };
    folder.add(options, 'enableCamera')
      .onChange((value: boolean) => value
        ? this.videoCamera.enableCamera()
        : this.videoCamera.disableCamera());
  }

  createHideCameraGUI(folder: dat.GUI = this.gui) {
    const options = {
      hideCamera: true,
    };
    const video = document.getElementById('video') as HTMLVideoElement;
    folder.add(options, 'hideCamera').onChange((value: boolean) => {
      if (value) {
        video.style.visibility = 'hidden';
      } else {
        video.style.visibility = 'visible';
      }
    }).setValue(true);
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

  createControlGUI() {
    const controlFolder = this.gui.addFolder('Control');
    this.createEnableCameraGUI(controlFolder);
    this.createHideCameraGUI(controlFolder);
    this.createPoseEstimationGUI(controlFolder);
    this.createHandEstimationGUI(controlFolder);
    controlFolder.open();
  }
}
