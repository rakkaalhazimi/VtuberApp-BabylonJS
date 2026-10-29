import '@/style.css';

import * as BABYLON from '@babylonjs/core';
import * as BABYLONMMD from 'babylon-mmd';
import 'babylon-mmd/esm/Loader/pmxLoader';

// import { RotateBoneCommand } from '@/command/index';
import { PoseLandmarkerEstimation } from '@/computer-vision/pose-estimation';
import { ControlGUI } from '@/gui/control';
import { MMDGUI } from '@/gui/mmd-gui';
import { MMDMovementGuider } from '@/mmd/guider';
// import { loopBack } from '@/utils';
import { VideoCamera } from '@/video/video';
import { HandLandmarkerEstimation } from './computer-vision/hand-landmarker';
import { PoseLandmarkerDrawer } from './computer-vision/pose-drawer';
import { PoseEMAFilter } from './computer-vision/pose-ema-filter';
import { PoseEstimationWorker } from './worker/pose-estimation-worker';



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
  camera.setTarget(new BABYLON.Vector3(0, 17, 100));
  camera.position = new BABYLON.Vector3(0, 17, -15);
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


  // Video Camera
  const videoCamera = new VideoCamera('video');
  videoCamera.enableCamera();

  const videoCanvas = document.getElementById('video-canvas') as HTMLCanvasElement;
  const handCanvas = document.getElementById('hand-canvas') as HTMLCanvasElement;

  const ctx = videoCanvas.getContext('2d');
  const handCtx = handCanvas.getContext('2d');


  // Pose Estimation
  const pose = new PoseLandmarkerEstimation();
  // await pose.loadPoseLandmarkerDetector();
  const poseDrawer = new PoseLandmarkerDrawer(videoCamera.width, videoCamera.height);
  const poseWorker = new PoseEstimationWorker();

  const hand = new HandLandmarkerEstimation(videoCamera);
  await hand.loadHandLandmarkerDetector();

  const poseEmaFilter = new PoseEMAFilter();


  // GUI
  const mmdGui = new MMDGUI(mmdModel);
  mmdGui.createBoneGUI();
  mmdGui.createMorphGUI();

  const controlGUI = new ControlGUI(videoCamera, pose, hand);
  controlGUI.createControlGUI();


  // const poseResult = await pose.estimatePose(videoCamera.video);
  // console.log(poseResult);
  const guider = new MMDMovementGuider(mmdModel);

  scene.onBeforeRenderObservable.add(async () => {
    if (poseWorker.isProcessing) return;

    if (videoCamera.video.readyState >= 2) {
      poseWorker.isProcessing = true;
      const poseResult = await poseWorker.post('POSE_ESTIMATION', await createImageBitmap(videoCamera.video));
      const filteredPoseResult = poseEmaFilter.filter(poseResult);
      poseDrawer.drawPoseLandmarks(ctx!, filteredPoseResult!);
      guider.guideHeadMovement(poseResult);
      guider.guideUpperBodyMovement(poseResult);
      guider.guideLeftArmMovement(poseResult);
      guider.guideRightArmMovement(poseResult);
      guider.guideLeftElbowMovementHinge(poseResult);
      guider.guideRightElbowMovementHinge(poseResult);
      poseWorker.isProcessing = false;
    }
  });

  scene.onBeforeRenderObservable.add(async () => {
    // const poseResult = await pose.estimatePose(videoCamera.video);
    // const filteredPoseResult = poseEmaFilter.filter(poseResult);
    // const handResult = await hand.estimateHand(videoCamera.video);

    // if (filteredPoseResult) {
    // poseDrawer.drawPoseLandmarks(ctx!, filteredPoseResult);
    // }

    // if (poseResult) {
    // guider.guideHeadMovement(poseResult);
    // guider.guideUpperBodyMovement(poseResult);
    // guider.guideLeftArmMovement(poseResult);
    // guider.guideRightArmMovement(poseResult);
    // guider.guideLeftElbowMovementHinge(poseResult);
    // guider.guideRightElbowMovementHinge(poseResult);
    // };

    // if (handResult) {
    // hand.drawHandLandmarks(handCtx!, handResult);
    // guider.guideLeftFingersMovement(handResult);
    // guider.guideRightFingersMovement(handResult);
    // };

    // if (poseResult && handResult) {
    // guider.guideLeftForearmTwist(poseResult, handResult);
    // guider.guideRightForearmTwist(poseResult, handResult);
    // }
  });

  scene.onBeforeRenderObservable.add(async () => {
    const handResult = await hand.estimateHand(videoCamera.video);
    if (!handResult) return;
    hand.drawHandLandmarks(handCtx!, handResult);
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