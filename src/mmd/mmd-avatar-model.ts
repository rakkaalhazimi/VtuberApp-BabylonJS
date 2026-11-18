import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { createMMDBoneState, type MMDBoneState } from '@/mmd/mmd-bone-state';
import { type BoneKeyType } from '@/mmd/translation';



export class MMDAvatarModel {
  public readonly boneState: MMDBoneState;
  public readonly morphController: BABYLONMMD.MmdMorphController;

  constructor(
    public readonly mmdModel: BABYLONMMD.MmdModel,
    public readonly mmdMesh: BABYLONMMD.MmdMesh,
  ) {
    // Automatically created and bound once on instantiation
    this.boneState = createMMDBoneState(mmdModel);
    this.morphController = mmdModel.morph;
  }

  rotateBone(key: BoneKeyType, quaternion: BABYLON.Quaternion) {
    const selected = this.boneState[key];
    if (!selected) return;
    selected.bone.rotationQuaternion = quaternion;
  }

  public dispose(runtime: BABYLONMMD.MmdRuntime): void {
    runtime.destroyMmdModel(this.mmdModel);
  }
}