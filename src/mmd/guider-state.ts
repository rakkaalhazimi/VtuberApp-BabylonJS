import * as BABYLON from '@babylonjs/core';



export class GuiderState {
  public upperBodyPitch: number = 0;
  public upperBodyYaw: number = 0;
  public upperBodyRoll: number = 0;

  public headPitch: number = 0;
  public headYaw: number = 0;
  public headRoll: number = 0;

  public leftArmQuaternion = new BABYLON.Quaternion();
  public rightArmQuaternion = new BABYLON.Quaternion();

  // Neutral nose-drop (nose.y - midEar.y, raw MediaPipe coords where +y = down).
  // Calibrated on first valid frame; pitch is measured relative to it.
  public neutralNoseDrop: number | null = null;
}