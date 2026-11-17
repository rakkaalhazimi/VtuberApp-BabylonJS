import * as BABYLONMMD from 'babylon-mmd';

import { createMMDBoneState, type MMDBoneState } from '@/mmd/mmd-bone-state';



export class MMDAvatarModel {
  public readonly mmdModel: BABYLONMMD.MmdModel;
  public readonly mmdMesh: BABYLONMMD.MmdMesh;
  public readonly boneState: MMDBoneState;
  public readonly morphController: BABYLONMMD.MmdMorphController;

  constructor(mmdModel: BABYLONMMD.MmdModel, mmdMesh: BABYLONMMD.MmdMesh) {
    this.mmdModel = mmdModel;
    this.mmdMesh = mmdMesh;
    // Automatically created and bound once on instantiation
    this.boneState = createMMDBoneState(mmdModel);
    this.morphController = mmdModel.morph;
  }

  public dispose(runtime: BABYLONMMD.MmdRuntime): void {
    runtime.destroyMmdModel(this.mmdModel);
  }
}