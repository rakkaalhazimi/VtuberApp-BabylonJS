import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

// Pose Landmarker keypoint pairs to connect for drawing the skeleton (33 landmarks, same
// order as the Pose Landmarker / BlazePose model).
const poseLandmarkerConnections = [
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
  public videoWidth: number;
  public videoHeight: number;
  public landmarker: PoseLandmarker | undefined;

  constructor(videoHeight: number, videoWidth: number) {
    this.videoHeight = videoHeight;
    this.videoWidth = videoWidth;
  }

  async loadPoseLandmarkerDetector(options: PoseLandmarkerOptions = {}) {
    console.log('Loading pose landmarker detector...');

    const vision = await FilesetResolver.forVisionTasks(
      options.wasmPath ?? DEFAULT_WASM_PATH,
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

  async estimatePose(video: HTMLVideoElement): Promise<PoseLandmarkerResult> {
    if (!this.landmarker) {
      throw new Error(
        'Pose landmarker is not loaded. Call loadPoseLandmarkerDetector() first.',
      );
    }
    return this.landmarker.detectForVideo(video, performance.now());
  }

  async drawPoseLandmarks(
    ctx: CanvasRenderingContext2D,
    result: PoseLandmarkerResult,
  ) {
    const landmarks = result.landmarks[0];

    if (!landmarks) {
      return;
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);

    // Normalized landmarks are scaled to the video dimensions
    const toCanvasX = (x: number) => x * this.videoWidth;
    const toCanvasY = (y: number) => y * this.videoHeight;

    // Draw keypoints
    for (const keypoint of landmarks) {
      const visibility = keypoint.visibility ?? 1;

      if (visibility < POSE_CONFIDENCE_SCORE) {
        continue;
      }

      ctx.beginPath();
      ctx.arc(toCanvasX(keypoint.x), toCanvasY(keypoint.y), 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
    }

    // Draw skeletons
    for (const connections of poseLandmarkerConnections) {
      const [index1, index2] = connections;
      const keyPoint1 = landmarks[index1];
      const keyPoint2 = landmarks[index2];

      if (
        (keyPoint1.visibility ?? 1) < POSE_CONFIDENCE_SCORE ||
        (keyPoint2.visibility ?? 1) < POSE_CONFIDENCE_SCORE
      ) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(toCanvasX(keyPoint1.x), toCanvasY(keyPoint1.y));
      ctx.lineTo(toCanvasX(keyPoint2.x), toCanvasY(keyPoint2.y));
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}