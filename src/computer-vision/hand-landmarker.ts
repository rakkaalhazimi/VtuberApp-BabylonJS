import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { VideoCamera } from "@/video/video";



// Hand Landmarker keypoint pairs to connect for drawing the hand skeleton (21 landmarks,
// same order as the Hand Landmarker model, see
// https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/index#models).
export const handLandmarkerConnections: Array<[number, number]> = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger + palm link to index
  [5, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger + palm link to middle
  [9, 13], [13, 14], [14, 15], [15, 16],
  // Pinky finger + palm link to ring
  [13, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [0, 17],
];

export enum HandLandmarkerPoint {
  WRIST,
  THUMB_CMC,
  THUMB_MCP,
  THUMB_IP,
  THUMB_TIP,
  INDEX_FINGER_MCP,
  INDEX_FINGER_PIP,
  INDEX_FINGER_DIP,
  INDEX_FINGER_TIP,
  MIDDLE_FINGER_MCP,
  MIDDLE_FINGER_PIP,
  MIDDLE_FINGER_DIP,
  MIDDLE_FINGER_TIP,
  RING_FINGER_MCP,
  RING_FINGER_PIP,
  RING_FINGER_DIP,
  RING_FINGER_TIP,
  PINKY_MCP,
  PINKY_PIP,
  PINKY_DIP,
  PINKY_TIP,
}

export const HAND_CONFIDENCE_SCORE = 0.5;

const DEFAULT_MODEL_PATH = '/pose/hand_landmarker.task';

const DEFAULT_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export interface HandLandmarkerOptions {
  modelAssetPath?: string;
  wasmPath?: string;
  numHands?: number;
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minTrackingConfidence?: number;
  delegate?: 'GPU' | 'CPU';
}

export class HandLandmarkerEstimation {
  public videoWidth: number;
  public videoHeight: number;
  public landmarker: HandLandmarker | undefined;
  public ctx: CanvasRenderingContext2D | undefined = undefined;
  public isEnabled: boolean = false;

  constructor(public videoCamera: VideoCamera) {
    this.videoHeight = videoCamera.height;
    this.videoWidth = videoCamera.width;
  }

  async loadHandLandmarkerDetector(options: HandLandmarkerOptions = {}) {
    const vision = await FilesetResolver.forVisionTasks(
      options.wasmPath ?? DEFAULT_WASM_PATH,
    );

    this.landmarker = await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: options.modelAssetPath ?? DEFAULT_MODEL_PATH,
          delegate: options.delegate ?? 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: options.numHands ?? 2,
        minHandDetectionConfidence: options.minHandDetectionConfidence ?? 0.5,
        minHandPresenceConfidence: options.minHandPresenceConfidence ?? 0.5,
        minTrackingConfidence: options.minTrackingConfidence ?? 0.5,
      });

    console.log('Hand landmarker detector is loaded');
    return this.landmarker;
  }

  async estimateHand(video: HTMLVideoElement): Promise<HandLandmarkerResult | null> {
    if (!this.landmarker) {
      throw new Error(
        'Pose landmarker is not loaded. Call loadPoseLandmarkerDetector() first.',
      );
    }
    if (!this.isEnabled) return null;
    if (!this.videoCamera.isEnable) return null;
    return this.landmarker.detectForVideo(video, performance.now());
  }

  drawHandLandmarks(
    ctx: CanvasRenderingContext2D,
    result: HandLandmarkerResult,
  ) {
    const allHands = result.landmarks;
    this.ctx = ctx;

    // Clear previous drawings
    ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);

    if (!allHands || allHands.length === 0) {
      return;
    }

    // Normalized landmarks are scaled to the video dimensions
    const toCanvasX = (x: number) => x * this.videoWidth;
    const toCanvasY = (y: number) => y * this.videoHeight;

    for (const landmarks of allHands) {
      if (!landmarks) {
        continue;
      }

      // Draw keypoints
      for (const keypoint of landmarks) {
        const visibility = keypoint.visibility ?? 1;

        if (visibility < HAND_CONFIDENCE_SCORE) {
          // continue;
        }

        ctx.beginPath();
        ctx.arc(toCanvasX(keypoint.x), toCanvasY(keypoint.y), 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }

      // Draw skeletons
      for (const connections of handLandmarkerConnections) {
        const [index1, index2] = connections;
        const keyPoint1 = landmarks[index1];
        const keyPoint2 = landmarks[index2];

        if (!keyPoint1 || !keyPoint2) {
          continue;
        }

        if (
          (keyPoint1.visibility ?? 1) < HAND_CONFIDENCE_SCORE ||
          (keyPoint2.visibility ?? 1) < HAND_CONFIDENCE_SCORE
        ) {
          // continue;
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

  enableHandLandmarks() {
    this.isEnabled = true;
  }

  disableHandLandmarks() {
    this.isEnabled = false;
    this.ctx?.clearRect(0, 0, this.videoWidth, this.videoHeight);
  }
}