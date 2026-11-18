import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import * as dat from 'dat.gui';

import type { PoseMMDAnimation } from '@/animation/poseMMDAnimation';
import type { MMDAvatarController } from '@/mmd/mmd-avatar-controller';
import { EyeGlowEffect } from '@/mmd-effect/eye-glow-effect';
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
  private effectFolder: dat.GUI | null = null;

  constructor(
    private gui: dat.GUI = new dat.GUI(),
  ) {
    this.mainFolder = this.gui.addFolder('MMD');
  };

  public createChangeMMDModelGUI(
    avatarController: MMDAvatarController,
    poseMMD: PoseMMDAnimation,
    folder: dat.GUI = this.mainFolder,
  ) {
    const options = { path: '' };
    const paths = Object.fromEntries(pmxFolders);
    const loaderFolder = folder.addFolder('Loader');

    loaderFolder.add(options, 'path', paths)
      .onChange(async (path) => {
        const avatarModel = await avatarController.loadCharacter(path);
        this.createEffectGUI(avatarController);
        this.createMMDGUI(avatarModel.mmdModel);
        poseMMD.useMmdModel(avatarModel.mmdModel);
      });
    loaderFolder.open();
  }


  public createEyeGlowEffectGUI(avatarController: MMDAvatarController, folder: dat.GUI = this.mainFolder) {
    const eyeGlow = avatarController.effects.getAllEffects()
      .find((item) => item.effect instanceof EyeGlowEffect);

    if (!eyeGlow) return;

    const name = eyeGlow.name;
    const effect = eyeGlow.effect as EyeGlowEffect;
    const config = effect.getConfig();
    const eyeGlowFolder = folder.addFolder(name);

    eyeGlowFolder.add(effect, 'isEnabled').onChange((value: boolean) => value
      ? effect.enable()
      : effect.disable());

    eyeGlowFolder.addColor(config, 'emissiveColor')
      .onChange((color: string) => effect.updateConfig({emissiveColor: color}));

    eyeGlowFolder.add(config, 'glowIntensity', 0, 1, 0.1)
      .onChange((value: number) => effect.updateConfig({glowIntensity: value}));
  }

  public createEffectGUI(avatarController: MMDAvatarController, folder: dat.GUI = this.mainFolder) {
    if (this.effectFolder) {
      folder.removeFolder(this.effectFolder);
    }
    this.effectFolder = folder.addFolder('Effect');
    this.createEyeGlowEffectGUI(avatarController, this.effectFolder);
    this.effectFolder.open();
  }

  private createBoneGUI(mmdModel: BABYLONMMD.MmdModel, folder: dat.GUI = this.mainFolder) {
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

  private createMorphGUI(mmdModel: BABYLONMMD.MmdModel, folder: dat.GUI = this.mainFolder) {
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

  public createMMDGUI(mmdModel: BABYLONMMD.MmdModel | null, folder: dat.GUI = this.mainFolder) {
    if (!mmdModel) {
      console.warn('No MMD Model found, cancel GUI creation.');
      return;
    }
    this.createBoneGUI(mmdModel, folder);
    this.createMorphGUI(mmdModel, folder);
    folder.open();
  }

};
