import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { Command } from "@/command/command";



export class RotateBoneCumCommand extends Command {
  constructor(
    private bone: BABYLONMMD.IMmdRuntimeLinkedBone,
    private axis: BABYLON.DeepImmutableObject<BABYLON.Vector3>,
    private angle: number,
  ) {
    super();
  };

  run() {
    this.bone.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(
      this.axis,
      this.angle,
    ));
  }

  undo() {
    this.bone.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(
      this.axis,
      -this.angle,
    ));
  }
}