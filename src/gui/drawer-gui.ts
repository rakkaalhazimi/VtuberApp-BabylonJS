import type { FaceLandmarkerDrawer } from '@/drawer/face-drawer';
import type { HandLandmarkerDrawer } from '@/drawer/hand-drawer';
import type { PoseLandmarkerDrawer } from '@/drawer/pose-drawer';
import * as dat from 'dat.gui';



export class DrawerGUI {
  private mainFolder: dat.GUI;

  constructor(
    private faceDrawer: FaceLandmarkerDrawer,
    private poseDrawer: PoseLandmarkerDrawer,
    private handDrawer: HandLandmarkerDrawer,
    private gui: dat.GUI = new dat.GUI(),
  ) {
    this.mainFolder = gui.addFolder('Drawer');
  }

  createPoseEstimationGUI(folder: dat.GUI = this.gui) {
    const options = {
      poseDrawer: this.poseDrawer.isEnabled,
    };
    folder.add(options, 'poseDrawer').onChange((value: boolean) => value
      ? this.poseDrawer.enableDrawer()
      : this.poseDrawer.disableDrawer());
  }

  createFaceEstimationGUI(folder: dat.GUI = this.gui) {
    const options = {
      faceDrawer: this.faceDrawer.isEnabled,
    };
    folder.add(options, 'faceDrawer').onChange((value: boolean) => value
      ? this.faceDrawer.enableDrawer()
      : this.faceDrawer.disableDrawer());
  }

  createHandEstimationGUI(folder: dat.GUI = this.gui) {
    const options = {
      handDrawer: this.handDrawer.isEnabled,
    };
    folder.add(options, 'handDrawer').onChange((value: boolean) => value
      ? this.handDrawer.enableDrawer()
      : this.handDrawer.disableDrawer());
  }

  createDrawerGUI(folder: dat.GUI = this.mainFolder) {
    this.createPoseEstimationGUI(folder);
    this.createFaceEstimationGUI(folder);
    this.createHandEstimationGUI(folder);
    folder.close();
  }
}