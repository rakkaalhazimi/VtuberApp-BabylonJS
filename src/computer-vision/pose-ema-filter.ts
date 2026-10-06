import type { Landmark, NormalizedLandmark, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

import { PoseLandmarkerPoint } from '@/computer-vision/pose-estimation';



const poseLength = Object.keys(PoseLandmarkerPoint).length / 2;

// EMA - Exponential Moving Average
export class PoseEMAFilter {
  private alpha: number = 0.25;
  private prevLandmarks: NormalizedLandmark[] = [];
  private prevWorldLandmarks: Landmark[] = [];

  constructor() {}

  filter(result: PoseLandmarkerResult | null): PoseLandmarkerResult | null {
    if (!result) return result;

    const landmarks = result.landmarks[0];
    const worldLandmarks = result.worldLandmarks[0];

    if (!landmarks || !worldLandmarks) return result;

    if (this.prevLandmarks.length === 0 || this.prevWorldLandmarks.length === 0) {
      this.prevLandmarks = landmarks;
      this.prevWorldLandmarks = worldLandmarks;
      return result;
    }

    for (let i = 0; i < poseLength; i++) {
      landmarks[i].x += (landmarks[i].x - this.prevLandmarks[i].x) * this.alpha;
      landmarks[i].y += (landmarks[i].y - this.prevLandmarks[i].y) * this.alpha;
      landmarks[i].z += (landmarks[i].z - this.prevLandmarks[i].z) * this.alpha;

      worldLandmarks[i].x += (worldLandmarks[i].x - this.prevWorldLandmarks[i].x) * this.alpha;
      worldLandmarks[i].y += (worldLandmarks[i].y - this.prevWorldLandmarks[i].y) * this.alpha;
      worldLandmarks[i].z += (worldLandmarks[i].z - this.prevWorldLandmarks[i].z) * this.alpha;
    }

    this.prevLandmarks = landmarks;
    this.prevWorldLandmarks = worldLandmarks;

    result.landmarks[0] = landmarks;
    result.worldLandmarks[0] = worldLandmarks;

    return result;
  }
}