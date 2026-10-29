import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";

import { HAND_CONFIDENCE_SCORE, handLandmarkerConnections } from "./hand-landmarker";



export class HandLandmarkerDrawer {
  constructor(
    public videoWidth: number,
    public videoHeight: number) {}

  drawHandLandmarks(
    ctx: CanvasRenderingContext2D,
    result: HandLandmarkerResult,
  ) {
    const allHands = result.landmarks;

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
}