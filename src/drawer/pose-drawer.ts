import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";

import { POSE_CONFIDENCE_SCORE } from "@/computer-vision/pose-landmarker";



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

export class PoseLandmarkerDrawer {
  constructor(
    public videoWidth: number,
    public videoHeight: number) {}

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