import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';

import type { MmdEffect } from "@/mmd-effect/mmd-effect";



export class MMDEffectManager {
  private effects: {name: string, effect: MmdEffect<object>}[] = [];

  public register(name: string, effect: MmdEffect<object>): void {
    this.effects.push({name, effect});
  }

  public getAllEffects() {
    return this.effects;
  }

  public getEffect(name: string) {
    return this.effects.find((reg) => reg.name === name);
  }

  public applyAll(scene: BABYLON.Scene, materials: BABYLONMMD.MmdStandardMaterial[]): void {
    // Clean up old effect resources (like GlowLayers) before re-applying to a new model
    this.disposeAll();
    for (const { effect } of this.effects) {
      effect.applyEffect(scene, materials);
    }
  }

  public disposeAll(): void {
    for (const { effect } of this.effects) {
      effect.dispose();
    }
  }
}