import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";

import { PoseLandmarkerPoint } from "./pose-estimation";
import { parseLandmark, parseLandmarkNew } from "@/utils";



export function createPoseLandmarkState(pose: PoseLandmarkerResult) {
  const landmarks = pose.worldLandmarks[0];
  const landmarks2D = pose.landmarks[0];
  if (!landmarks || !landmarks2D) return;
  return {
    NOSE: parseLandmarkNew(pose, PoseLandmarkerPoint.NOSE),
    LEFT_EYE_INNER: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_EYE_INNER),
    LEFT_EYE: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_EYE),
    LEFT_EYE_OUTER: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_EYE_OUTER),
    RIGHT_EYE_INNER: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_EYE_INNER),
    RIGHT_EYE: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_EYE),
    RIGHT_EYE_OUTER: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_EYE_OUTER),
    LEFT_EAR: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_EAR),
    RIGHT_EAR: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_EAR),
    MOUTH_LEFT: parseLandmarkNew(pose, PoseLandmarkerPoint.MOUTH_LEFT),
    MOUTH_RIGHT: parseLandmarkNew(pose, PoseLandmarkerPoint.MOUTH_RIGHT),
    LEFT_SHOULDER: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_SHOULDER),
    RIGHT_SHOULDER: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_SHOULDER),
    LEFT_ELBOW: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_ELBOW),
    RIGHT_ELBOW: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_ELBOW),
    LEFT_WRIST: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_WRIST),
    RIGHT_WRIST: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_WRIST),
    LEFT_PINKY: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_PINKY),
    RIGHT_PINKY: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_PINKY),
    LEFT_INDEX: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_INDEX),
    RIGHT_INDEX: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_INDEX),
    LEFT_THUMB: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_THUMB),
    RIGHT_THUMB: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_THUMB),
    LEFT_HIP: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_HIP),
    RIGHT_HIP: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_HIP),
    LEFT_KNEE: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_KNEE),
    RIGHT_KNEE: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_KNEE),
    LEFT_ANKLE: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_ANKLE),
    RIGHT_ANKLE: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_ANKLE),
    LEFT_HEEL: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_HEEL),
    RIGHT_HEEL: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_HEEL),
    LEFT_FOOT_INDEX: parseLandmarkNew(pose, PoseLandmarkerPoint.LEFT_FOOT_INDEX),
    RIGHT_FOOT_INDEX: parseLandmarkNew(pose, PoseLandmarkerPoint.RIGHT_FOOT_INDEX),
  };
}

export type PoseLandmarkState = ReturnType<typeof createPoseLandmarkState>;