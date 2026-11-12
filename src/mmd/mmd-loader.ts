import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';


export class MMDLoader {
  public currentContainer: BABYLON.AssetContainer | null = null;
  public currentMmdMesh: BABYLONMMD.MmdMesh | null = null;
  public currentMmdModel: BABYLONMMD.MmdModel | null = null;
  public mmdCamera: BABYLONMMD.MmdCamera;
  public vmdLoader: BABYLONMMD.VmdLoader;

  constructor(public scene: BABYLON.Scene) {
    this.mmdCamera = new BABYLONMMD.MmdCamera('MmdCamera', new BABYLON.Vector3(0, 10, 0), scene);
    this.vmdLoader = new BABYLONMMD.VmdLoader(scene);
  }

  addAnimation() {

  }

  async loadModel(mmdRuntime: BABYLONMMD.MmdRuntime, path: string) {
    if (this.currentContainer) {
      this.currentContainer.dispose(); // This removes meshes, skeletons, and materials from memory
      this.currentContainer = null;
      this.currentMmdMesh = null;
    }

    this.currentContainer = await BABYLON.LoadAssetContainerAsync(path, this.scene);
    this.currentContainer.addAllToScene();
    this.currentMmdMesh = this.currentContainer.rootNodes[0] as BABYLONMMD.MmdMesh;

    this.currentMmdModel = mmdRuntime.createMmdModel(this.currentMmdMesh);

    return this.currentMmdModel;

    // const cameraAnimationHandle = this.mmdCamera.createRuntimeAnimation(mmdAnimation);
    // mmdCamera.setRuntimeAnimation(cameraAnimationHandle);
    // mmdRuntime.addAnimatable(mmdCamera);

    // for (const mesh of mmdMesh.metadata.meshes) {
    //   mesh.receiveShadows = true;
    // };
    // shadowGenerator.addShadowCaster(mmdMesh);
    // const mmdModel = mmdRuntime.createMmdModel(mmdMesh);
    // const modelAnimationHandle = mmdModel.createRuntimeAnimation(mmdAnimation);
    // mmdModel.setRuntimeAnimation(modelAnimationHandle);
  }

  getMMDModel() {
    return this.currentMmdModel;
  }
}