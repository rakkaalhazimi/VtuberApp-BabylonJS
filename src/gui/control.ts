import dat from 'dat.gui';

import type { PoseLandmarkerEstimation } from '@/computer-vision/pose-estimation';
import type { VideoCamera } from '@/video/video';

export class ControlGUI {
  private gui: dat.GUI;

  constructor(
    public videoCamera: VideoCamera,
    private poseEstimation: PoseLandmarkerEstimation,
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
      enablePoseEstimation: this.poseEstimation.isEnabled,
    };
    folder.add(options, 'enablePoseEstimation').onChange((value: boolean) => value
      ? this.poseEstimation.enablePoseLandmarks()
      : this.poseEstimation.disablePoseLandmarks());
  }

  createControlGUI() {
    const controlFolder = this.gui.addFolder('Control');
    this.createEnableCameraGUI(controlFolder);
    this.createHideCameraGUI(controlFolder);
    this.createPoseEstimationGUI(controlFolder);
    controlFolder.open();
  }
}
