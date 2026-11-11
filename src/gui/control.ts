import * as BABYLON from '@babylonjs/core';
import dat from 'dat.gui';

import type { VideoCamera } from '@/video/video';



export class ControlGUI {

  constructor(
    private scene: BABYLON.Scene,
    public videoCamera: VideoCamera,
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

  createControlGUI(folder: dat.GUI = this.gui.addFolder('Control')) {
    this.createChangeBgColorGUI(folder);
    this.createEnableCameraGUI(folder);
    this.createHideCameraGUI(folder);
    folder.open();
  }
}
