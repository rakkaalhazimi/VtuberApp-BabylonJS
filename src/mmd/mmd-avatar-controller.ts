import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { EyeGlowEffect } from '@/mmd-effect/eye-glow-effect';
import {
  LEFT_ARM_DEFAULT_QUATERNION,
  RIGHT_ARM_DEFAULT_QUATERNION,
} from '@/mmd/guider-state';
import { MMDAvatarLoader } from '@/mmd/mmd-avatar-loader';
import { MMDAvatarModel } from '@/mmd/mmd-avatar-model';
import { MMDEffectManager } from '@/mmd-effect/mmd-effect-manager';
import { BoneKey } from '@/mmd/translation';
import { LightReflectionEffect } from '@/mmd-effect/light-reflection-effect';



export class MMDAvatarController {
  private loader: MMDAvatarLoader;
  public avatarModel: MMDAvatarModel | null = null;
  public effects = new MMDEffectManager();

  constructor(
    private scene: BABYLON.Scene,
    private camera: BABYLON.Camera,
    public mmdRuntime: BABYLONMMD.MmdRuntime,
    shadowGenerator?: BABYLON.ShadowGenerator,
  ) {
    this.loader = new MMDAvatarLoader(this.scene, mmdRuntime, shadowGenerator);

    const eyeGlow = new EyeGlowEffect();
    this.effects.register('Eye Glow', eyeGlow);

    const lightReflect = new LightReflectionEffect();
    // this.effects.register('Light Reflect', lightReflect);
  }

  public async loadCharacter(path: string): Promise<MMDAvatarModel> {
    const { model, mesh } = await this.loader.load(path);
    const materials = mesh.metadata.materials as BABYLONMMD.MmdStandardMaterial[];
    this.avatarModel = new MMDAvatarModel(model, mesh);

    this.restArms(this.avatarModel);
    this.focusCameraOnHead(this.avatarModel);
    this.effects.applyAll(this.scene, materials);

    return this.avatarModel;
  }

  public async loadAnimation(path: string) {
    const vmdLoader = new BABYLONMMD.VmdLoader(this.scene);
    const mmdAnimation = await vmdLoader.loadAsync('motion',
      [
        path,
      ]);

    const mmdCamera = new BABYLONMMD.MmdCamera('MmdCamera', new BABYLON.Vector3(0, 10, 0), this.scene);
    const cameraAnimationHandle = mmdCamera.createRuntimeAnimation(mmdAnimation);
    mmdCamera.setRuntimeAnimation(cameraAnimationHandle);
    this.mmdRuntime.addAnimatable(mmdCamera);

    if (!this.avatarModel?.mmdModel) return;
    const modelAnimationHandle = this.avatarModel.mmdModel.createRuntimeAnimation(mmdAnimation);
    this.avatarModel.mmdModel.setRuntimeAnimation(modelAnimationHandle);
  }

  public async playAnimation() {
    await this.mmdRuntime.playAnimation();
  }

  public pauseAnimation() {
    this.mmdRuntime.pauseAnimation();
  }

  public restArms(model: MMDAvatarModel) {
    model.rotateBone(BoneKey.LEFT_ARM, LEFT_ARM_DEFAULT_QUATERNION);
    model.rotateBone(BoneKey.RIGHT_ARM, RIGHT_ARM_DEFAULT_QUATERNION);
  }

  public focusCameraOnHead(model: MMDAvatarModel): void {
    const head = model?.boneState.HEAD;
    if (head) {
      this.camera.position = new BABYLON.Vector3(0, head.restPosition.y, -15);
    }
  }
}