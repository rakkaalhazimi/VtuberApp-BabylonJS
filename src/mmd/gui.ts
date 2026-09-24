import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import * as dat from 'dat.gui';

import { boneTranslations, morphTranslations } from './translation';
import { RotateBoneCommand } from '@/command';


export class MMDGui {

  private gui: dat.GUI;

  constructor(
    private model: BABYLONMMD.MmdModel,
  ) {
    this.gui = new dat.GUI();
  };


  createBoneGUI() {
    const axisMap = {
      'x': new BABYLON.Vector3(1, 0, 0),
      'y': new BABYLON.Vector3(0, 1, 0),
      'z': new BABYLON.Vector3(0, 0, 1),
    };
    const boneFolder = this.gui.addFolder('Bone');
    for (const [localName, globalName] of Object.entries(boneTranslations)) {
      const options: Record<string, number> = {};
      const bone = this.model.runtimeBones.find(b => b.name === localName);

      if (!bone) continue;

      const nameFolder = boneFolder.addFolder(globalName);
      for (const [axis, vector] of Object.entries(axisMap)) {
        options[axis] = 0;
        nameFolder.add(options, axis, -Math.PI, Math.PI, 0.1).onChange((value) => {
          const rotateCmd = new RotateBoneCommand(bone.linkedBone, vector, value);
          rotateCmd.run();
        });
      }
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