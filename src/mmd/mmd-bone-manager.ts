import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';



interface MMDBone {
  bone: BABYLON.Bone;
  restPosition: BABYLON.Vector3;
}

export class MMDBoneManager {
  constructor(public model: BABYLONMMD.MmdModel) { }

  getBoneByName(localName: string): MMDBone | undefined {
    const bone = this.model.mesh.metadata.skeleton.bones.find(b => b.name === localName);
    if (!bone) return;
    return {
      bone,
      restPosition: this.getBoneRestPosition(bone),
    };
  }

  getBoneRestPosition(bone: BABYLON.Bone): BABYLON.Vector3 {
    // 1. Get the local rest matrix of the bone
    const localRestMatrix = bone.getRestMatrix();

    // 2. Compute the world space rest matrix by compounding up the skeleton hierarchy
    const worldRestMatrix = localRestMatrix.clone();
    let parent = bone.getParent();
    while (parent) {
      worldRestMatrix.multiplyToRef(parent.getRestMatrix(), worldRestMatrix);
      parent = parent.getParent();
    }

    // 3. Apply the parent mesh's world matrix to respect its global positioning/scaling
    worldRestMatrix.multiplyToRef(this.model.mesh.getWorldMatrix(), worldRestMatrix);

    // 4. Extract the absolute position vector
    const restPosition = worldRestMatrix.getTranslation();
    return restPosition;
  }
}