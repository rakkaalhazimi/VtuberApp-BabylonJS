import type { FaceLandmarkerDrawer } from '@/drawer/face-drawer';
import type { HandLandmarkerDrawer } from '@/drawer/hand-drawer';
import type { PoseLandmarkerDrawer } from '@/drawer/pose-drawer';
import * as dat from 'dat.gui';



export class DrawerGUI {
  private mainFolder: dat.GUI;

  constructor(
    private gui: dat.GUI = new dat.GUI(),
  ) {
    this.mainFolder = this.gui.addFolder('Drawer');
    this.mainFolder.open();
  }

  createPoseEstimationGUI(poseDrawer: PoseLandmarkerDrawer, folder: dat.GUI = this.mainFolder) {
    const options = {
      poseDrawer: poseDrawer.isEnabled,
    };
    folder.add(options, 'poseDrawer').onChange((value: boolean) => value
      ? poseDrawer.enableDrawer()
      : poseDrawer.disableDrawer());
  }

  createFaceEstimationGUI(faceDrawer: FaceLandmarkerDrawer, folder: dat.GUI = this.mainFolder) {
    const options = {
      faceDrawer: faceDrawer.isEnabled,
    };
    folder.add(options, 'faceDrawer').onChange((value: boolean) => value
      ? faceDrawer.enableDrawer()
      : faceDrawer.disableDrawer());
  }

  createHandEstimationGUI(handDrawer: HandLandmarkerDrawer, folder: dat.GUI = this.mainFolder) {
    const options = {
      handDrawer: handDrawer.isEnabled,
    };
    folder.add(options, 'handDrawer').onChange((value: boolean) => value
      ? handDrawer.enableDrawer()
      : handDrawer.disableDrawer());
  }
}