import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";

import { HAND_CONFIDENCE_SCORE } from "@/computer-vision/hand-landmarker";
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

export class HandLandmarkerDrawer {
  public isEnabled = false;

  constructor(
    public videoWidth: number,
    public videoHeight: number) {}

  drawHandLandmarks(
    ctx: CanvasRenderingContext2D,
    result: HandLandmarkerResult,
  ) {
    // Clear previous drawings
    ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);

    if (!this.isEnabled) return;

    const allHands = result.landmarks;

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

  enableDrawer() {
    this.isEnabled = true;
  }

  disableDrawer() {
    this.isEnabled = false;
  }
}