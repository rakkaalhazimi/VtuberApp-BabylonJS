import * as BABYLON from "@babylonjs/core";
import { MmdStandardMaterial } from "babylon-mmd";



export abstract class MmdEffect<TConfig extends object> {
  protected config: TConfig;
  public isEnabled: boolean = true;

  constructor(defaultConfig: TConfig, initialOverrides?: Partial<TConfig>) {
    this.config = { ...defaultConfig, ...initialOverrides };
  }

  /**
   * Shared method to edit any subset of the effect's properties safely.
   * TypeScript automatically infers the exact keys allowed for each subclass!
   */
  public updateConfig(newConfig: Partial<TConfig>): void {
    Object.assign(this.config, newConfig);
    this.onConfigUpdated();
  }

  public enable() {
    this.isEnabled = true;
    this.onConfigUpdated();
  }

  public disable() {
    this.isEnabled = false;
    this.onConfigUpdated();
  }

  /**
   * Optional hook for subclasses that need to immediately react when
   * properties change (e.g., updating a Babylon GlowLayer or Material).
   */
  protected onConfigUpdated(): void { }

  public getConfig() {
    return this.config;
  }

  /**
   * Shared abstract method every effect must implement.
   */
  public abstract applyEffect(
    scene: BABYLON.Scene,
    materials: MmdStandardMaterial[]
  ): void;

  /**
   * Useful for hot-swapping models cleanly without memory leaks.
   */
  public abstract dispose(): void;
}