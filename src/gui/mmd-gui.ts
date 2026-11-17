import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import * as dat from 'dat.gui';

import type { PoseMMDAnimation } from '@/animation/poseMMDAnimation';
import type { MMDLoader } from '@/mmd/mmd-loader';
import { boneTranslations, morphTranslations } from '@/mmd/translation';



const allPmx = import.meta.glob('/public/models/**/*.pmx');
const pmxFolders = Object.keys(allPmx).map(path => {
  const parts = path.split('/');
  const folderName = parts.at(-2)!; // "miku"
  const runtimeUrl = path.replace('/public', ''); // "/models/miku/miku_v2.pmx"

  return [folderName, runtimeUrl];
});

export class MMDGUI {
  private mainFolder: dat.GUI;
  private boneFolder: dat.GUI | null = null;
  private morphFolder: dat.GUI | null = null;

  constructor(
    private gui: dat.GUI = new dat.GUI(),
  ) {
    this.mainFolder = this.gui.addFolder('MMD');
  };

  createChangeMMDModelGUI(
    mmdLoader: MMDLoader,
    poseMMD: PoseMMDAnimation,
    folder: dat.GUI = this.mainFolder,
  ) {
    const options = { path: '' };
    const paths = Object.fromEntries(pmxFolders);
    const loaderFolder = folder.addFolder('Loader');
    loaderFolder.add(options, 'path', paths)
      .onChange(async (path) => {
        const mmdModel = await mmdLoader.loadModel(path);
        this.createMMDGUI(mmdModel);
        poseMMD.useMmdModel(mmdModel);
      });
    loaderFolder.open();
  }

  createBoneGUI(mmdModel: BABYLONMMD.MmdModel, folder: dat.GUI = this.mainFolder) {
    if (this.boneFolder) {
      console.log('Remove folder');
      folder.removeFolder(this.boneFolder);
    }
    this.boneFolder = folder.addFolder('Bone');

    for (const value of Object.values(boneTranslations)) {
      const bone = mmdModel.runtimeBones.find(b => b.name === value.localName);

      if (!bone) continue;

      const options: Record<string, number> = {
        'x': 0,
        'y': 0,
        'z': 0,
      };
      const nameFolder = this.boneFolder.addFolder(value.globalName);
      nameFolder.add(options, 'x', -Math.PI, Math.PI, 0.1).onChange((value) => {
        const targetQuaternion = BABYLON.Quaternion.FromEulerAngles(value, options.y, options.z);
        bone.linkedBone.rotationQuaternion = targetQuaternion;
      });
      nameFolder.add(options, 'y', -Math.PI, Math.PI, 0.1).onChange((value) => {
        const targetQuaternion = BABYLON.Quaternion.FromEulerAngles(options.x, value, options.z);
        bone.linkedBone.rotationQuaternion = targetQuaternion;
      });
      nameFolder.add(options, 'z', -Math.PI, Math.PI, 0.1).onChange((value) => {
        const targetQuaternion = BABYLON.Quaternion.FromEulerAngles(options.x, options.y, value);
        bone.linkedBone.rotationQuaternion = targetQuaternion;
      });
    }
  }

  createMorphGUI(mmdModel: BABYLONMMD.MmdModel, folder: dat.GUI = this.mainFolder) {
    if (this.morphFolder) {
      folder.removeFolder(this.morphFolder);
    }
    this.morphFolder = folder.addFolder('Morph');

    const options: Record<string, number> = {};
    for (const [localName, globalName] of Object.entries(morphTranslations)) {
      const morphController = mmdModel.morph;
      const morph = morphController.morphs.find(m => m.name === localName);

      if (!morph) continue;

      options[globalName] = 0;
      this.morphFolder.add(options, globalName, 0, 1, 0.1).onChange((value) => {
        morphController.setMorphWeight(localName, value);
      });
    }
  }

  createMMDGUI(mmdModel: BABYLONMMD.MmdModel | null, folder: dat.GUI = this.mainFolder) {
    if (!mmdModel) {
      console.warn('No MMD Model found, cancel GUI creation.');
      return;
    }
    this.createBoneGUI(mmdModel, folder);
    this.createMorphGUI(mmdModel, folder);
    folder.open();
  }

};
