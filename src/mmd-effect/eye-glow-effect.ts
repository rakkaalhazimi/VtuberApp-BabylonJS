import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import { MmdEffect } from '@/mmd-effect/mmd-effect';




export interface EyeGlowConfig {
  emissiveColor: string;
  glowIntensity: number;
  targetPattern: string[];
}

export class EyeGlowEffect extends MmdEffect<EyeGlowConfig> {
  private glowLayer?: BABYLON.GlowLayer;
  private targetMaterials: BABYLONMMD.MmdStandardMaterial[] = [];

  constructor(overrides?: Partial<EyeGlowConfig>) {
    super(
      {
        emissiveColor: '#66CCFF',
        glowIntensity: 0.8,
        targetPattern: ['eye', 'iris', 'pupil', 'highlight', '目', '瞳', 'ハイライト'],
      },
      overrides,
    );
  }

  public applyEffect(scene: BABYLON.Scene, materials: BABYLONMMD.MmdStandardMaterial[]): void {
    this.targetMaterials = materials.filter((m) =>
      this.config.targetPattern.includes(m.name),
    );

    this.glowLayer = new BABYLON.GlowLayer('mmdEyeGlow', scene, {
      mainTextureSamples: 4,
      blurKernelSize: 64,
    });

    // Isolate the glow strictly to your exact eyeMaterial instance
    this.glowLayer.customEmissiveColorSelector = (_mesh, _subMesh, material, result) => {
      if (this.targetMaterials.includes(material as BABYLONMMD.MmdStandardMaterial)) {
        const color = BABYLON.Color4.FromHexString(this.config.emissiveColor);
        result.copyFrom(color);  // Match or boost your emissive RGBA
      } else {
        result.set(0, 0, 0, 0); // Block everything else from glowing
      }
    };

    this.onConfigUpdated(); // Apply initial config values
  }

  protected override onConfigUpdated(): void {
    if (this.glowLayer) {
      this.glowLayer.intensity = this.isEnabled ? this.config.glowIntensity : 0;
    }

    for (const mat of this.targetMaterials) {
      // Set the emissive color
      mat.emissiveColor = this.isEnabled
        ? BABYLON.Color3.FromHexString(this.config.emissiveColor)
        : BABYLON.Color3.Black();

      // Reuse its diffuseTexture so only the iris pattern glows
      mat.emissiveTexture = mat.diffuseTexture;
    }
  }

  public dispose(): void {
    this.glowLayer?.dispose();
    this.targetMaterials = [];
  }
}