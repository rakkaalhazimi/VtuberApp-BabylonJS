import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { createMMDBoneState, type MMDBoneState } from '@/mmd/mmd-bone-state';
import { type BoneKeyType } from '@/mmd/translation';



export class MMDAvatarModel {
  public readonly boneState: MMDBoneState;
  public readonly morphController: BABYLONMMD.MmdMorphController;
  public materials: BABYLONMMD.MmdStandardMaterial[];

  constructor(
    public readonly mmdModel: BABYLONMMD.MmdModel,
    public readonly mmdMesh: BABYLONMMD.MmdMesh,
  ) {
    // Automatically created and bound once on instantiation
    this.boneState = createMMDBoneState(mmdModel);
    this.morphController = mmdModel.morph;
    this.materials = this.mmdModel.mesh.metadata.materials as BABYLONMMD.MmdStandardMaterial[];
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