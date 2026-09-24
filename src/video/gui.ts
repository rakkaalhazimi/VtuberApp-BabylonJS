import dat from 'dat.gui';

import type { VideoCamera } from "@/video/video";



export class VideoGUI {
  private gui: dat.GUI;

  constructor(public videoCamera: VideoCamera) {
    this.gui = new dat.GUI();
  }

  createEnableCameraGUI() {
    const options = {
      enableCamera: this.videoCamera.isEnable,
    };
    this.gui.add(options, 'enableCamera')
      .onChange((value) => value
        ? this.videoCamera.enableCamera()
        : this.videoCamera.disableCamera());
  }

}