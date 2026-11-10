import * as BABYLON from '@babylonjs/core';



export class GuiderState {

  public eyeLWink: number = 0;
  public eyeRWink: number = 0;
  public eyeBlink: number = 0;

  public pupil = {x: 0, y: 0};

  public mouthShapeA: number = 0;
  public mouthShapeI: number = 0;
  public mouthShapeU: number = 0;
  public mouthShapeE: number = 0;
  public mouthShapeO: number = 0;

  public upperBody = {x: 0, y: 0, z: 0};

  public headPitch: number = 0;
  public headYaw: number = 0;
  public headRoll: number = 0;
  public head = {x: 0, y: 0, z: 0};

  public rigthWrist = {x: 0, y: 0, z: 0};
  public rightRingMCP = {x: 0, y: 0, z: 0};
  public rightRingPIP = {x: 0, y: 0, z: 0};
  public rightRingDIP = {x: 0, y: 0, z: 0};
  public rightIndexMCP = {x: 0, y: 0, z: 0};
  public rightIndexPIP = {x: 0, y: 0, z: 0};
  public rightIndexDIP = {x: 0, y: 0, z: 0};
  public rightMiddleMCP = {x: 0, y: 0, z: 0};
  public rightMiddlePIP = {x: 0, y: 0, z: 0};
  public rightMiddleDIP = {x: 0, y: 0, z: 0};
  public rightThumbMCP = {x: 0, y: 0, z: 0};
  public rightThumbPIP = {x: 0, y: 0, z: 0};
  public rightThumbDIP = {x: 0, y: 0, z: 0};
  public rightLittleMCP = {x: 0, y: 0, z: 0};
  public rightLittlePIP = {x: 0, y: 0, z: 0};
  public rightLittleDIP = {x: 0, y: 0, z: 0};

  public leftWrist = {x: 0, y: 0, z: 0};
  public leftRingMCP = {x: 0, y: 0, z: 0};
  public leftRingPIP = {x: 0, y: 0, z: 0};
  public leftRingDIP = {x: 0, y: 0, z: 0};
  public leftIndexMCP = {x: 0, y: 0, z: 0};
  public leftIndexPIP = {x: 0, y: 0, z: 0};
  public leftIndexDIP = {x: 0, y: 0, z: 0};
  public leftMiddleMCP = {x: 0, y: 0, z: 0};
  public leftMiddlePIP = {x: 0, y: 0, z: 0};
  public leftMiddleDIP = {x: 0, y: 0, z: 0};
  public leftThumbMCP = {x: 0, y: 0, z: 0};
  public leftThumbPIP = {x: 0, y: 0, z: 0};
  public leftThumbDIP = {x: 0, y: 0, z: 0};
  public leftLittleMCP = {x: 0, y: 0, z: 0};
  public leftLittlePIP = {x: 0, y: 0, z: 0};
  public leftLittleDIP = {x: 0, y: 0, z: 0};

  public leftUpperArm = {x: 0, y: 0, z: 0};
  public leftLowerArm = {x: 0, y: 0, z: 0};

  public leftArmQuaternion = new BABYLON.Quaternion();
  public rightArmQuaternion = new BABYLON.Quaternion();

  public leftArmTwistQuaternion = new BABYLON.Quaternion();
  public leftElbowHingeQuaternion = new BABYLON.Quaternion();

  public rightArmTwistQuaternion = new BABYLON.Quaternion();
  public rightElbowHingeQuaternion = new BABYLON.Quaternion();

  // Neutral nose-drop (nose.y - midEar.y, raw MediaPipe coords where +y = down).
  // Calibrated on first valid frame; pitch is measured relative to it.
  public neutralNoseDrop: number | null = null;
}