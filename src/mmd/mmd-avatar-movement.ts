import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import type { MMDAvatarModel } from '@/mmd/mmd-avatar-model';
import { AnimationKey, type MMDAvatarAnimation } from '@/mmd/mmd-avatar-animation';
import { BoneKey } from '@/mmd/translation';



export class MMDAvatarMovement {
  public position = BABYLON.Vector3.Zero();
  public rotation = BABYLON.Vector3.Zero();
  public isPressed = false;

  constructor(
    public camera: BABYLON.Camera,
    public avatarModel: MMDAvatarModel,
    public avatarAnimation: MMDAvatarAnimation,
  ) { }

  public moveCharacter() {
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW':
          this.position.z += 0.5;
          this.rotation.y = Math.PI;
          break;
        case 'KeyA':
          this.position.x -= 0.5;
          this.rotation.y = Math.PI / 2;
          break;
        case 'KeyS':
          this.position.z -= 0.5;
          this.rotation.y = 0;
          break;
        case 'KeyD':
          this.position.x += 0.5;
          this.rotation.y = -Math.PI / 2;
          break;
      }
      if (this.avatarAnimation.currentKey != AnimationKey.WALK) {
        this.avatarAnimation.playAnimation(AnimationKey.WALK);
      }
      this.avatarModel.translateMesh(this.position);
      this.avatarModel.rotateMesh(this.rotation);

      this.camera.position.x = this.position.x;
      this.camera.position.z = -15 + this.position.z;
      // this.avatarAnimation.resumeAnimation();
    });

    document.addEventListener('keyup', (event) => {
      // this.avatarAnimation.playAnimation(AnimationKey.IDLE);
      this.avatarAnimation.pauseAnimation();
    });
  }

};