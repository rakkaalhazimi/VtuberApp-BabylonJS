import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { MMDAvatarLoader } from '@/mmd/mmd-avatar-loader';
import { MMDAvatarModel } from '@/mmd/mmd-avatar-model';



export class MMDAvatarController {
  private loader: MMDAvatarLoader;
  private avatarModel: MMDAvatarModel | null = null;
  // public effects = new EffectManager();
  // public eyeGlow = new EyeGlowEffect(); // GUI sliders can bind directly to this!

  constructor(
    private scene: BABYLON.Scene,
    private camera: BABYLON.Camera,
    mmdRuntime: BABYLONMMD.MmdRuntime,
    shadowGenerator?: BABYLON.ShadowGenerator,
  ) {
    this.loader = new MMDAvatarLoader(this.scene, mmdRuntime, shadowGenerator);
    // this.effects.register(this.eyeGlow);
  }

  public async loadCharacter(path: string): Promise<MMDAvatarModel> {
    const { model, mesh } = await this.loader.load(path);
    this.avatarModel = new MMDAvatarModel(model, mesh);

    // const materials = mesh.metadata.materials as BABYLONMMD.MmdStandardMaterial[];
    // this.effects.applyAll(this.scene, materials);

    this.focusCameraOnHead(this.avatarModel);

    return this.avatarModel;
  }

  public focusCameraOnHead(model: MMDAvatarModel): void {
    const head = model?.boneState.HEAD;
    if (head) {
      this.camera.position = new BABYLON.Vector3(0, head.restPosition.y, -15);
    }
  }
}