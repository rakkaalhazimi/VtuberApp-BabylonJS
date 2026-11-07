import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  faceLandmarkerContourConnections,
  faceLandmarkerFaceOvalConnections,
  faceLandmarkerLeftEyebrowConnections,
  faceLandmarkerLeftEyeConnections,
  faceLandmarkerLeftIrisConnections,
  faceLandmarkerLipsConnections,
  faceLandmarkerRightEyebrowConnections,
  faceLandmarkerRightEyeConnections,
  faceLandmarkerRightIrisConnections,
  faceLandmarkerTesselationConnections,
} from "./face-landmarker";



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
  constructor(
    public videoWidth: number,
    public videoHeight: number) { }

  drawFaceLandmarks(
    ctx: CanvasRenderingContext2D,
    result: FaceLandmarkerResult,
  ) {
    const faceLandmarks = result.faceLandmarks[0];

    // Clear previous drawings
    ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);

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
}