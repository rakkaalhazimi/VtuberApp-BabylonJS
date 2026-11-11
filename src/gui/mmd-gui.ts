import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import * as dat from 'dat.gui';

import { boneTranslations, morphTranslations } from '@/mmd/translation';

export class MMDGUI {

  constructor(
    private model: BABYLONMMD.MmdModel,
    private gui: dat.GUI = new dat.GUI(),
  ) {};

  createBoneGUI(folder: dat.GUI = this.gui) {
    const boneFolder = folder.addFolder('Bone');
    for (const value of Object.values(boneTranslations)) {
      const bone = this.model.runtimeBones.find(b => b.name === value.localName);

      if (!bone) continue;

      const options: Record<string, number> = {
        'x': 0,
        'y': 0,
        'z': 0,
      };
      const nameFolder = boneFolder.addFolder(value.globalName);
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

  createMorphGUI(folder: dat.GUI = this.gui) {
    const morphFolder = folder.addFolder('Morph');
    const options: Record<string, number> = {};
    for (const [localName, globalName] of Object.entries(morphTranslations)) {
      const morphController = this.model.morph;
      const morph = morphController.morphs.find(m => m.name === localName);

      if (!morph) continue;

      options[globalName] = 0;
      morphFolder.add(options, globalName, 0, 1, 0.1).onChange((value) => {
        morphController.setMorphWeight(localName, value);
      });
    }
  }

  createMMDGUI(folder: dat.GUI = this.gui.addFolder('MMD')) {
    this.createBoneGUI(folder);
    this.createMorphGUI(folder);
    folder.open();
  }

};
