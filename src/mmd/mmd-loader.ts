import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { createMMDBoneState } from '@/mmd/mmd-bone-state';



export class MMDLoader {
  public container: BABYLON.AssetContainer | null = null;
  public mmdMesh: BABYLONMMD.MmdMesh | null = null;
  public mmdModel: BABYLONMMD.MmdModel | null = null;
  public mmdCamera: BABYLONMMD.MmdCamera | null = null;
  public mmdRuntime: BABYLONMMD.MmdRuntime | null = null;
  public camera: BABYLON.Camera | null = null;
  public shadowGenerator: BABYLON.ShadowGenerator | null = null;
  public vmdLoader: BABYLONMMD.VmdLoader;

  constructor(public scene: BABYLON.Scene) {
    this.vmdLoader = new BABYLONMMD.VmdLoader(scene);
  }

  setCamera(camera: BABYLON.Camera) {
    this.camera = camera;
  }

  setMMDRuntime(mmdRuntime: BABYLONMMD.MmdRuntime) {
    this.mmdRuntime = mmdRuntime;
  }

  setShadowGenerator(shadowGenerator: BABYLON.ShadowGenerator) {
    this.shadowGenerator = shadowGenerator;
  }

  addAnimation() {

  }

  destroyModel(mmdRuntime: BABYLONMMD.MmdRuntime) {
    if (this.container) {
      mmdRuntime.destroyMmdModel(this.mmdModel!);
      this.container.dispose(); // This removes meshes, skeletons, and materials from memory
      this.container = null;
      this.mmdMesh = null;
    }
  }

  moveCameraToHead(mmdModel: BABYLONMMD.MmdModel) {
    if (!this.camera) {
      console.warn('No camera found after load model.');
      return;
    };
    const boneState = createMMDBoneState(mmdModel);
    const head = boneState.HEAD;
    if (!head) {
      console.warn(`Head bone isn't found.`);
      return;
    };
    const headPos = head.restPosition;
    this.camera.position = new BABYLON.Vector3(0, headPos.y, -15);
  }

  enableModelShadow(mmdMesh: BABYLONMMD.MmdMesh) {
    if (!this.shadowGenerator) {
      console.warn('No shadow generator found for MMD Model.');
      return;
    }
    for (const mesh of mmdMesh.metadata.meshes) {
      mesh.receiveShadows = true;
    };
    this.shadowGenerator.addShadowCaster(mmdMesh);
    // const mmdModel = mmdRuntime.createMmdModel(mmdMesh);
    // const modelAnimationHandle = mmdModel.createRuntimeAnimation(mmdAnimation);
    // mmdModel.setRuntimeAnimation(modelAnimationHandle);
  }

  async loadModel(path: string) {
    if (!this.mmdRuntime) {
      console.warn(`MMDRuntime isn't set, cancel model loading.`);
      return null;
    }
    const newContainer = await BABYLON.LoadAssetContainerAsync(path, this.scene);
    const newMmdMesh = newContainer.rootNodes[0] as BABYLONMMD.MmdMesh;

    this.destroyModel(this.mmdRuntime);

    this.container = newContainer;
    this.mmdMesh = newMmdMesh;
    this.enableModelShadow(this.mmdMesh);
    this.container.addAllToScene();

    this.mmdModel = this.mmdRuntime.createMmdModel(this.mmdMesh);
    this.moveCameraToHead(this.mmdModel);

    return this.mmdModel;

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
    return this.mmdModel;
  }
}