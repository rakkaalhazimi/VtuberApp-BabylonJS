import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import type {
  FaceLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';

// Face Landmarker keypoint connections (468/478 landmarks, same order as the Face
// Landmarker model). The static arrays are provided by the MediaPipe SDK, see
// https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker#models.
export const faceLandmarkerLipsConnections =
  FaceLandmarker.FACE_LANDMARKS_LIPS;
export const faceLandmarkerLeftEyeConnections =
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYE;
export const faceLandmarkerRightEyeConnections =
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE;
export const faceLandmarkerLeftEyebrowConnections =
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW;
export const faceLandmarkerRightEyebrowConnections =
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW;
export const faceLandmarkerLeftIrisConnections =
  FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS;
export const faceLandmarkerRightIrisConnections =
  FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS;
export const faceLandmarkerFaceOvalConnections =
  FaceLandmarker.FACE_LANDMARKS_FACE_OVAL;
export const faceLandmarkerContourConnections =
  FaceLandmarker.FACE_LANDMARKS_CONTOURS;
export const faceLandmarkerTesselationConnections =
  FaceLandmarker.FACE_LANDMARKS_TESSELATION;

// A small subset of the most frequently used face landmark indices. For the full
// 478 point map, see the keypoints reference linked above.
export enum FaceLandmarkerPoint {
  // Face outline
  FOREHEAD = 10,
  CHIN = 152,

  // Nose
  NOSE_TIP = 1,

  // Right eye (subject's right)
  RIGHT_EYE_OUTER = 33,
  RIGHT_EYE_INNER = 133,
  RIGHT_IRIS_CENTER = 468,

  // Left eye (subject's left)
  LEFT_EYE_INNER = 362,
  LEFT_EYE_OUTER = 263,
  LEFT_IRIS_CENTER = 473,

  // Mouth
  MOUTH_RIGHT = 61,
  MOUTH_LEFT = 291,
}

export const FACE_CONFIDENCE_SCORE = 0.5;

const DEFAULT_MODEL_PATH = '/pose/face_landmarker.task';

const DEFAULT_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export interface FaceLandmarkerOptions {
  modelAssetPath?: string;
  wasmPath?: string;
  numFaces?: number;
  minFaceDetectionConfidence?: number;
  minFacePresenceConfidence?: number;
  minTrackingConfidence?: number;
  outputFaceBlendshapes?: boolean;
  outputFacialTransformationMatrixes?: boolean;
  delegate?: 'GPU' | 'CPU';
}

export class FaceLandmarkerEstimation {
  public landmarker: FaceLandmarker | undefined;
  public isEnabled: boolean = true;

  constructor() {}

  async loadFaceLandmarkerDetector(options: FaceLandmarkerOptions = {}) {
    console.log('Loading face landmarker detector...');

    const vision = await FilesetResolver.forVisionTasks(
      options.wasmPath ?? DEFAULT_WASM_PATH,
      true,
    );

    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: options.modelAssetPath ?? DEFAULT_MODEL_PATH,
        delegate: options.delegate ?? 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: options.numFaces ?? 1,
      minFaceDetectionConfidence:
        options.minFaceDetectionConfidence ?? FACE_CONFIDENCE_SCORE,
      minFacePresenceConfidence:
        options.minFacePresenceConfidence ?? FACE_CONFIDENCE_SCORE,
      minTrackingConfidence:
        options.minTrackingConfidence ?? FACE_CONFIDENCE_SCORE,
      outputFaceBlendshapes: options.outputFaceBlendshapes ?? true,
      outputFacialTransformationMatrixes:
        options.outputFacialTransformationMatrixes ?? false,
    });

    console.log('Face landmarker detector is loaded');
    return this.landmarker;
  }

  async estimateFace(
    video: TexImageSource,
  ): Promise<FaceLandmarkerResult | null> {
    if (!this.landmarker) {
      throw new Error(
        'Face landmarker is not loaded. Call loadFaceLandmarkerDetector() first.',
      );
    }
    if (!this.isEnabled) return null;
    return this.landmarker.detectForVideo(video, performance.now());
  }

  enableFaceLandmarks() {
    this.isEnabled = true;
  }

  disableFaceLandmarks() {
    this.isEnabled = false;
  }

  static GetFirstFace(
    result: FaceLandmarkerResult,
  ): NormalizedLandmark[] | undefined {
    if (result.faceLandmarks.length === 0) return undefined;
    return result.faceLandmarks[0];
  }

  static GetFaceBlendshapes(result: FaceLandmarkerResult) {
    if (result.faceBlendshapes.length === 0) return undefined;
    return result.faceBlendshapes[0];
  }
}
