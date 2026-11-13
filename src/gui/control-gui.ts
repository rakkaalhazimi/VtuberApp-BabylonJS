import * as BABYLON from '@babylonjs/core';
import dat from 'dat.gui';

import type { VideoCamera } from '@/video/video';



export class ControlGUI {
  private mainFolder: dat.GUI;

  constructor(private gui: dat.GUI = new dat.GUI()) {
    this.mainFolder = this.gui.addFolder('Control');
    this.mainFolder.open();
  }

  createChangeBgColorGUI(scene: BABYLON.Scene, folder: dat.GUI = this.mainFolder) {
    const options = {
      background: '',
    };
    const colors = {
      white: '#ffffff',
      black: '#000000',
      green: '#009933',
    };
    folder.add(options, 'background', colors)
      .onChange((color) => scene.clearColor = BABYLON.Color4.FromHexString(color))
      .setValue(colors.black);
  }

  createEnableCameraGUI(videoCamera: VideoCamera, folder: dat.GUI = this.mainFolder) {
    const options = {
      enableCamera: videoCamera.isEnable,
    };
    folder.add(options, 'enableCamera')
      .onChange((value: boolean) => value
        ? videoCamera.enableCamera()
        : videoCamera.disableCamera());
  }

  createHideCameraGUI(videoCamera: VideoCamera, folder: dat.GUI = this.mainFolder) {
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
}
