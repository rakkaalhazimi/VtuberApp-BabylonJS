import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

// Pose Landmarker keypoint pairs to connect for drawing the skeleton (33 landmarks, same
// order as the Pose Landmarker / BlazePose model).
export const poseLandmarkerConnections = [
  // Head and Face
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Upper Body
  [11, 12], [11, 23], [23, 25], [25, 27], [27, 29], [29, 31],
  [12, 24], [24, 26], [26, 28], [28, 30], [30, 32],
  // Arms
  [11, 13], [13, 15], [12, 14], [14, 16],
  // Hands and Fingers
  [15, 17], [15, 19], [15, 21],
  [16, 18], [16, 20], [16, 22],
];

export enum PoseLandmarkerPoint {
  NOSE,
  LEFT_EYE_INNER,
  LEFT_EYE,
  LEFT_EYE_OUTER,
  RIGHT_EYE_INNER,
  RIGHT_EYE,
  RIGHT_EYE_OUTER,
  LEFT_EAR,
  RIGHT_EAR,
  MOUTH_LEFT,
  MOUTH_RIGHT,
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_ELBOW,
  RIGHT_ELBOW,
  LEFT_WRIST,
  RIGHT_WRIST,
  LEFT_PINKY,
  RIGHT_PINKY,
  LEFT_INDEX,
  RIGHT_INDEX,
  LEFT_THUMB,
  RIGHT_THUMB,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
  LEFT_HEEL,
  RIGHT_HEEL,
  LEFT_FOOT_INDEX,
  RIGHT_FOOT_INDEX,
}

export const POSE_CONFIDENCE_SCORE = 0.5;

export const DEFAULT_MODEL_PATH = '/pose/pose_landmarker_lite.task';

export const DEFAULT_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export interface PoseLandmarkerOptions {
  modelAssetPath?: string;
  wasmPath?: string;
  numPoses?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  delegate?: 'GPU' | 'CPU';
}

export class PoseLandmarkerEstimation {
  public landmarker: PoseLandmarker | undefined;
  public ctx: CanvasRenderingContext2D | undefined = undefined;
  public isEnabled: boolean = true;

  constructor() {
  }

  async loadPoseLandmarkerDetector(options: PoseLandmarkerOptions = {}) {
    console.log('Loading pose landmarker detector...');

    const vision = await FilesetResolver.forVisionTasks(
      options.wasmPath ?? DEFAULT_WASM_PATH,
      true,
    );

    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: options.modelAssetPath ?? DEFAULT_MODEL_PATH,
        delegate: options.delegate ?? 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: options.numPoses ?? 1,
      minPoseDetectionConfidence: options.minPoseDetectionConfidence ?? 0.5,
      minPosePresenceConfidence: options.minPosePresenceConfidence ?? 0.5,
      minTrackingConfidence: options.minTrackingConfidence ?? 0.5,
    });

    console.log('Pose landmarker detector is loaded');
    return this.landmarker;
  }

  async estimatePose(video: TexImageSource): Promise<PoseLandmarkerResult | null> {
    if (!this.landmarker) {
      throw new Error(
        'Pose landmarker is not loaded. Call loadPoseLandmarkerDetector() first.',
      );
    }
    if (!this.isEnabled) return null;
    return this.landmarker.detectForVideo(video, performance.now());
  }

  enablePoseLandmarks() {
    this.isEnabled = true;
  }

  disablePoseLandmarks() {
    this.isEnabled = false;
  }
}