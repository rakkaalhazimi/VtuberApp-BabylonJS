import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';




export enum AnimationKey {
  IDLE = 'IDLE',
  WALK = 'WALK',
  RUN = 'RUN',
}

const ANIMATION_TYPE = {
  [AnimationKey.IDLE]: { name: AnimationKey.IDLE, path: '/vmd/idle-test.vmd' },
  [AnimationKey.WALK]: { name: AnimationKey.WALK, path: '/vmd/walk.vmd' },
  // RUN: {name: 'run', path: '/vmd/run.vmd'},
} as const;

type AnimationMap = Record<string, {
  animation: BABYLONMMD.MmdAnimation,
  animationHandle: BABYLONMMD.MmdRuntimeAnimationHandle,
}>;

export class MMDAvatarAnimation {
  public currentKey: AnimationKey = AnimationKey.IDLE;
  public vmdLoader: BABYLONMMD.VmdLoader;
  public mmdCamera: BABYLONMMD.MmdCamera;

  public animationMap: AnimationMap = {};

  public currentAnimation: BABYLONMMD.MmdAnimation | null = null;
  public currentAnimationHandle: BABYLONMMD.MmdRuntimeAnimationHandle | null = null;

  constructor(
    public scene: BABYLON.Scene,
    public mmdRuntime: BABYLONMMD.MmdRuntime,
    public mmdModel: BABYLONMMD.MmdModel,
  ) {
    this.mmdCamera = new BABYLONMMD.MmdCamera('MmdCamera', new BABYLON.Vector3(0, 10, 0), scene);
    this.vmdLoader = new BABYLONMMD.VmdLoader(this.scene);

    mmdRuntime.onPauseAnimationObservable.add(() => {
      if (mmdRuntime.currentFrameTime >= mmdRuntime.animationFrameTimeDuration) {
        mmdRuntime.seekAnimation(0, false);
        // mmdModel.initializePhysics();
        mmdRuntime.playAnimation();
      }
    });
  }

  public async initAnimation() {

    for (const [key, value] of Object.entries(ANIMATION_TYPE)) {
      const animation = await this.vmdLoader.loadAsync(value.name, [value.path]);
      const animationHandle = this.mmdModel.createRuntimeAnimation(animation);

      this.animationMap[value.name] = { animation, animationHandle };
    }
    // this.mmdRuntime.addAnimatable(this.mmdCamera);
  }

  public destroyAnimation() {
    if (!this.currentAnimationHandle) return;
    // this.mmdModel.destroyRuntimeAnimation(this.currentAnimationHandle);
    // this.mmdCamera.destroyRuntimeAnimation(this.currentAnimationHandle);
  }

  public playAnimation(key: AnimationKey) {
    this.destroyAnimation();

    const map = this.animationMap[key];
    if (!map) return;

    this.currentAnimation = map.animation;
    this.currentAnimationHandle = map.animationHandle;
    console.log('Map: ', map.animationHandle);
    this.mmdModel.setRuntimeAnimation(this.currentAnimationHandle);
    // this.mmdCamera.setRuntimeAnimation(this.currentAnimationHandle);

    this.mmdRuntime.playAnimation();
    this.currentKey = key;
  }
}