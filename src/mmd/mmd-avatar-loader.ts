import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';


export class MMDAvatarLoader {
  public container: BABYLON.AssetContainer | null = null;
  public mmdMesh: BABYLONMMD.MmdMesh | null = null;
  public mmdModel: BABYLONMMD.MmdModel | null = null;

  constructor(
    private scene: BABYLON.Scene,
    private mmdRuntime: BABYLONMMD.MmdRuntime,
    private shadowGenerator?: BABYLON.ShadowGenerator,
  ) {}

  public async load(path: string): Promise<{ model: BABYLONMMD.MmdModel; mesh: BABYLONMMD.MmdMesh }> {
    const newContainer = await BABYLON.LoadAssetContainerAsync(path, this.scene);
    const newMesh = newContainer.rootNodes[0] as BABYLONMMD.MmdMesh;

    this.disposeCurrent();

    this.container = newContainer;
    this.mmdMesh = newMesh;
    this.container.addAllToScene();

    if (this.shadowGenerator) {
      for (const mesh of newMesh.metadata.meshes) {
        mesh.receiveShadows = true;
      }
      this.shadowGenerator.addShadowCaster(newMesh);
    }

    this.mmdModel = this.mmdRuntime.createMmdModel(newMesh);
    return { model: this.mmdModel, mesh: this.mmdMesh };
  }

  public disposeCurrent(): void {
    if (this.mmdModel) {
      this.mmdRuntime.destroyMmdModel(this.mmdModel);
      this.mmdModel = null;
    }
    if (this.container) {
      this.container.dispose();
      this.container = null;
      this.mmdMesh = null;
    }
  }
}