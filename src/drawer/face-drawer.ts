import { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";


// Face Landmarker keypoint connections (468/478 landmarks, same order as the Face
// Landmarker model). The static arrays are provided by the MediaPipe SDK, see
// https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker#models.
const faceLandmarkerLipsConnections = FaceLandmarker.FACE_LANDMARKS_LIPS;
const faceLandmarkerLeftEyeConnections = FaceLandmarker.FACE_LANDMARKS_LEFT_EYE;
const faceLandmarkerRightEyeConnections = FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE;
const faceLandmarkerLeftEyebrowConnections = FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW;
const faceLandmarkerRightEyebrowConnections = FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW;
const faceLandmarkerLeftIrisConnections = FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS;
const faceLandmarkerRightIrisConnections = FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS;
const faceLandmarkerFaceOvalConnections = FaceLandmarker.FACE_LANDMARKS_FACE_OVAL;
const faceLandmarkerContourConnections = FaceLandmarker.FACE_LANDMARKS_CONTOURS;
const faceLandmarkerTesselationConnections = FaceLandmarker.FACE_LANDMARKS_TESSELATION;

const faceConnections = [
  faceLandmarkerLipsConnections,
  faceLandmarkerLeftEyeConnections,
  faceLandmarkerRightEyeConnections,
  faceLandmarkerLeftEyebrowConnections,
  faceLandmarkerRightEyebrowConnections,
  faceLandmarkerLeftIrisConnections,
  faceLandmarkerRightIrisConnections,
  faceLandmarkerFaceOvalConnections,
  faceLandmarkerContourConnections,
  faceLandmarkerTesselationConnections,
];

export class FaceLandmarkerDrawer {
  public isEnabled = false;

  constructor(
    public videoWidth: number,
    public videoHeight: number) { }

  drawFaceLandmarks(
    ctx: CanvasRenderingContext2D,
    result: FaceLandmarkerResult,
  ) {
    // Clear previous drawings
    ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);

    if (!this.isEnabled) return;

    const faceLandmarks = result.faceLandmarks[0];

    // Normalized landmarks are scaled to the video dimensions
    const toCanvasX = (x: number) => x * this.videoWidth;
    const toCanvasY = (y: number) => y * this.videoHeight;

    // Draw skeletons
    for (const connections of faceConnections) {
      for (const conn of connections) {
        const { start: index1, end: index2 } = conn;
        const keyPoint1 = faceLandmarks[index1];
        const keyPoint2 = faceLandmarks[index2];

        ctx.beginPath();
        ctx.moveTo(toCanvasX(keyPoint1.x), toCanvasY(keyPoint1.y));
        ctx.lineTo(toCanvasX(keyPoint2.x), toCanvasY(keyPoint2.y));
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  enableDrawer() {
    this.isEnabled = true;
  }

  disableDrawer() {
    this.isEnabled = false;
  }
}