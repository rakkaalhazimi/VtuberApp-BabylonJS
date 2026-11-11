import * as BABYLON from '@babylonjs/core';
import dat from 'dat.gui';

import type { VideoCamera } from '@/video/video';
import type { FaceLandmarkerWorker } from '@/worker/face-landmarker-worker';
import type { HandLandmarkerWorker } from '@/worker/hand-landmarker-worker';
import type { PoseEstimationWorker } from '@/worker/pose-estimation-worker';



export class ControlGUI {

  constructor(
    private scene: BABYLON.Scene,
    public videoCamera: VideoCamera,
    private poseWorker: PoseEstimationWorker,
    private handWorker: HandLandmarkerWorker,
    private faceWorker: FaceLandmarkerWorker,
    private gui: dat.GUI = new dat.GUI(),
  ) {}

  createChangeBgColorGUI(folder: dat.GUI = this.gui) {
    const options = {
      background: '',
    };
    const colors = {
      white: '#ffffff',
      black: '#000000',
      green: '#009933',
    };
    folder.add(options, 'background', colors)
      .onChange((color) => this.scene.clearColor = BABYLON.Color4.FromHexString(color));
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

  createFaceEstimationGUI(folder: dat.GUI = this.gui) {
    const options = {
      enableFaceEstimation: this.faceWorker.isEnabled,
    };
    folder.add(options, 'enableFaceEstimation').onChange((value: boolean) => value
      ? this.faceWorker.enableWorker()
      : this.faceWorker.disableWorker());
  }

  createControlGUI(folder: dat.GUI = this.gui.addFolder('Control')) {
    this.createChangeBgColorGUI(folder);
    this.createEnableCameraGUI(folder);
    this.createHideCameraGUI(folder);
    this.createPoseEstimationGUI(folder);
    this.createHandEstimationGUI(folder);
    this.createFaceEstimationGUI(folder);
    folder.open();
  }
}
