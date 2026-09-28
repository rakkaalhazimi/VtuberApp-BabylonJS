import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import * as dat from 'dat.gui';

import { boneTranslations, morphTranslations } from '@/mmd/translation';

export class MMDGUI {

  private gui: dat.GUI;

  constructor(
    private model: BABYLONMMD.MmdModel,
  ) {
    this.gui = new dat.GUI();
  };


  createBoneGUI() {
    const boneFolder = this.gui.addFolder('Bone');
    for (const [localName, globalName] of Object.entries(boneTranslations)) {
      const bone = this.model.runtimeBones.find(b => b.name === localName);

      if (!bone) continue;

      const options: Record<string, number> = {
        'x': 0,
        'y': 0,
        'z': 0,
      };
      const nameFolder = boneFolder.addFolder(globalName);
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

  createMorphGUI() {
    const morphFolder = this.gui.addFolder('Morph');
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

};
