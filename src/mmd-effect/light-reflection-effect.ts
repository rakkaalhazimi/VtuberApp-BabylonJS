import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { MmdEffect } from '@/mmd-effect/mmd-effect';




export interface LightReflectionConfig {
  specularColor: string;
  skinSpecularPower: number;
  clothesSpecularPower: number;
  targetPattern: RegExp;
}

export class LightReflectionEffect extends MmdEffect<LightReflectionConfig> {
  private targetMaterials: BABYLONMMD.MmdStandardMaterial[] = [];

  constructor(overrides?: Partial<LightReflectionConfig>) {
    super(
      {
        specularColor: '#66CCFF',
        skinSpecularPower: 24,
        clothesSpecularPower: 96,
        targetPattern: /skin|face|body|肌|顔|颜|体/i,
      },
      overrides,
    );
  }

  public applyEffect(scene: BABYLON.Scene, materials: BABYLONMMD.MmdStandardMaterial[]): void {
    this.targetMaterials = materials;
    this.onConfigUpdated();
  }

  protected override onConfigUpdated(): void {
    for (const mat of this.targetMaterials) {
      // 1. Lower ambientColor so shadows have depth and reflections stand out
      mat.ambientColor = mat.ambientColor.scale(0.25);

      // 2. Differentiate skin from glossy materials (hair, eyes, leather, metal)
      const isSkin = this.config.targetPattern.test(mat.name);
      if (isSkin) {
        mat.specularColor = new BABYLON.Color3(0.2, 0.18, 0.18);
        mat.specularPower = this.config.skinSpecularPower;
      } else {
        mat.specularColor = new BABYLON.Color3(0.9, 0.9, 0.95);
        mat.specularPower = this.config.clothesSpecularPower;
      }
    }
  }

  public dispose(): void {
    this.targetMaterials = [];
  }
}