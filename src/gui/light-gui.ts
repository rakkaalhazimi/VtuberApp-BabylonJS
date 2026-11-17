import * as BABYLON from '@babylonjs/core';
import * as dat from 'dat.gui';



export class LightGUI {
  private mainFolder: dat.GUI;

  constructor(private gui: dat.GUI = new dat.GUI()) {
    this.mainFolder = this.gui.addFolder('Light');
    this.mainFolder.open();
  }

  createLightGUI(light: BABYLON.Light, folder: dat.GUI = this.mainFolder) {
    const lightFolder = folder.addFolder(light.name);
    const options = {
      color: light.diffuse.toHexString(),
    };

    lightFolder.add(light, 'intensity', 0, 10, 0.1);
    lightFolder.addColor(options, 'color')
      .onChange((color: string) => light.diffuse = BABYLON.Color3.FromHexString(color));
    lightFolder.open();

    return lightFolder;
  }

  createPointLightGUI(light: BABYLON.PointLight, folder: dat.GUI = this.mainFolder) {
    const lightFolder = this.createLightGUI(light, folder);
    const positionFolder = lightFolder.addFolder('Position');

    positionFolder.add(light.position, 'x', -100, 100, 0.1);
    positionFolder.add(light.position, 'y', -100, 100, 0.1);
    positionFolder.add(light.position, 'z', -100, 100, 0.1);
    positionFolder.open();

    lightFolder.close();
  }

  createDirectionalLightGUI(light: BABYLON.DirectionalLight, folder: dat.GUI = this.mainFolder) {
    const lightFolder = this.createLightGUI(light, folder);
    const directionFolder = lightFolder.addFolder('Direction');

    directionFolder.add(light.direction, 'x', -1, 1, 0.01);
    directionFolder.add(light.direction, 'y', -1, 1, 0.01);
    directionFolder.add(light.direction, 'z', -1, 1, 0.01);
    directionFolder.open();
  }

  createSpotLightGUI(light: BABYLON.SpotLight, folder: dat.GUI = this.mainFolder) {
    const lightFolder = this.createLightGUI(light, folder);
    const positionFolder = lightFolder.addFolder('Position');
    const directionFolder = lightFolder.addFolder('Direction');

    positionFolder.add(light.position, 'x', -100, 100, 0.1);
    positionFolder.add(light.position, 'y', -100, 100, 0.1);
    positionFolder.add(light.position, 'z', -100, 100, 0.1);
    positionFolder.open();

    directionFolder.add(light.direction, 'x', -1, 1, 0.01);
    directionFolder.add(light.direction, 'y', -1, 1, 0.01);
    directionFolder.add(light.direction, 'z', -1, 1, 0.01);
    directionFolder.open();

    lightFolder.add(light, 'angle', 0, Math.PI / 2, 0.01);
    lightFolder.add(light, 'exponent', 0, 128, 1);
    lightFolder.close();
  }
}
