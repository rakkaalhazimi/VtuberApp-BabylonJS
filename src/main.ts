import '@/style.css';

import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import 'babylon-mmd/esm/Loader/pmxLoader';

// import { RotateBoneCommand } from '@/command/index';
import { PoseLandmarkerEstimation } from '@/computer-vision/pose-estimation';
import { ComputerVisionGUI } from '@/computer-vision/gui';
import { MMDGUI } from '@/mmd/gui';
// import { loopBack } from '@/utils';
import { VideoCamera } from '@/video/video';
import { VideoGUI } from './video/gui';



BABYLONMMD.RegisterPmxLoader();
BABYLONMMD.RegisterMmdOutlineRenderer();
BABYLONMMD.RegisterMmdRuntimeCameraAnimation();
BABYLONMMD.RegisterMmdRuntimeModelAnimation();

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement; // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

const createScene = async () => {
  // Creates a basic Babylon Scene object
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.95, 0.95, 0.95, 1.0);
  scene.ambientColor = new BABYLON.Color3(0.5, 0.5, 0.5);

  // Creates and positions a free camera
  const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene);
  const mmdCamera = new BABYLONMMD.MmdCamera('MmdCamera', new BABYLON.Vector3(0, 10, 0), scene);
  // Targets the camera to scene origin
  camera.setTarget(new BABYLON.Vector3(0, 0, 0));
  camera.position = new BABYLON.Vector3(0, 25, -30);
  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);
  camera.keysUp.push(87);    // 'W' key
  camera.keysDown.push(83);  // 'S' key
  camera.keysLeft.push(65);  // 'A' key
  camera.keysRight.push(68); // 'D' key


  const directionalLight = new BABYLON.DirectionalLight(
    'DirectionalLight',
    new BABYLON.Vector3(0.5, -1, 1),
    scene,
  );
  directionalLight.intensity = 1.0;
  directionalLight.autoCalcShadowZBounds = true;


  const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight, true);
  shadowGenerator.transparencyShadow = true;
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.forceBackFacesOnly = true;
  shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
  shadowGenerator.frustumEdgeFalloff = 0.1;

  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 2, segments: 32 }, scene);
  sphere.position.y = 1;
  sphere.receiveShadows = true;
  shadowGenerator.addShadowCaster(sphere);

  const ground = BABYLON.MeshBuilder.CreateGround('ground1', { width: 100, height: 100, subdivisions: 2, updatable: false }, scene);
  ground.receiveShadows = true;

  // Physics
  const wasmInstance = await BABYLONMMD.GetMmdWasmInstance(new BABYLONMMD.MmdWasmInstanceTypeMPR());
  const physicsRuntime = new BABYLONMMD.MultiPhysicsRuntime(wasmInstance);
  physicsRuntime.setGravity(new BABYLON.Vector3(0, -98, 0));
  physicsRuntime.register(scene);

  // MMD Runtime
  const mmdRuntime = new BABYLONMMD.MmdRuntime(scene, new BABYLONMMD.MmdBulletPhysics(physicsRuntime));
  // mmdRuntime.loggingEnabled = true;
  mmdRuntime.register(scene);
  // mmdRuntime.playAnimation();

  // VMD
  const vmdLoader = new BABYLONMMD.VmdLoader(scene);
  // vmdLoader.loggingEnabled = true;

  const mmdAnimation = await vmdLoader.loadAsync('motion',
    [
      '/vmd/walk.vmd',
    ]);

  // Model
  const mmdMesh = await BABYLON.LoadAssetContainerAsync(
    '/models/feixiao/星穹铁道—飞霄.pmx',
    scene,

  ).then((result) => {
    result.addAllToScene();
    return result.rootNodes[0] as BABYLONMMD.MmdMesh;
  });


  const cameraAnimationHandle = mmdCamera.createRuntimeAnimation(mmdAnimation);
  mmdCamera.setRuntimeAnimation(cameraAnimationHandle);
  mmdRuntime.addAnimatable(mmdCamera);

  for (const mesh of mmdMesh.metadata.meshes) {
    mesh.receiveShadows = true;
  };
  shadowGenerator.addShadowCaster(mmdMesh);
  const mmdModel = mmdRuntime.createMmdModel(mmdMesh);
  const modelAnimationHandle = mmdModel.createRuntimeAnimation(mmdAnimation);
  mmdModel.setRuntimeAnimation(modelAnimationHandle);

  // console.log('Morphs: ', mmdModel.morph.morphs);
  // const bone = mmdModel.runtimeBones.find(b => b.name === '左腕'); // e.g., Left Arm
  // const bone = mmdModel.runtimeBones.find(b => b.name === '頭');
  // let time = 0;

  // const looper = loopBack(-0.5, 0.5, 0.05);


  scene.onBeforeRenderObservable.add(() => {
    // if (!bone) return;
    // const deltaTime = engine.getDeltaTime() / 1000;
    // time += deltaTime;
    // const value = looper();
    // const rotateCmd = new RotateBoneCommand(
    //   bone.linkedBone,
    //   new BABYLON.Vector3(0, 1, 0),
    //   value,
    // );
    // rotateCmd.run();
  });


  // GUI
  const mmdGui = new MMDGUI(mmdModel);
  mmdGui.createBoneGUI();
  mmdGui.createMorphGUI();


  // Video Camera
  const videoCamera = new VideoCamera('video');
  videoCamera.enableCamera();
  const videoGui = new VideoGUI(videoCamera);
  videoGui.createEnableCameraGUI();



  // Pose Estimation
  const pose = new PoseLandmarkerEstimation(
    videoCamera.video.height, videoCamera.video.width);
  await pose.loadPoseLandmarkerDetector();

  const poseEstimationGUI = new ComputerVisionGUI(pose);
  poseEstimationGUI.createPoseEstimationGUI();

  // const poseResult = await pose.estimatePose(videoCamera.video);
  // console.log(poseResult);

  const videoCanvas = document.getElementById('video-canvas') as HTMLCanvasElement;
  const ctx = videoCanvas.getContext('2d');

  scene.onBeforeRenderObservable.add(async () => {
    if (!pose.isEnabled) return;
    if (!videoCamera.isEnable) return;
    const poseResult = await pose.estimatePose(videoCamera.video);
    pose.drawPoseLandmarks(ctx!, poseResult);
  });


  return scene;
};

const scene = await createScene();
engine.runRenderLoop(() => {
  scene.render();
});

console.log('Engine FPS: ', engine.getFps());

// Watch for browser/canvas resize events
window.addEventListener('resize', () => {
  engine.resize();
});