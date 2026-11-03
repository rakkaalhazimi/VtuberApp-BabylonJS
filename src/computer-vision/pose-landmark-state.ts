import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";

import { PoseLandmarkerPoint } from "./pose-estimation";
import { parseLandmark } from "@/utils";



export function createPoseLandmarkState(pose: PoseLandmarkerResult) {
  const landmarks = pose.worldLandmarks[0];
  if (!landmarks) return;
  return {
    NOSE: parseLandmark(landmarks[PoseLandmarkerPoint.NOSE]),
    LEFT_EYE_INNER: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_EYE_INNER]),
    LEFT_EYE: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_EYE]),
    LEFT_EYE_OUTER: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_EYE_OUTER]),
    RIGHT_EYE_INNER: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_EYE_INNER]),
    RIGHT_EYE: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_EYE]),
    RIGHT_EYE_OUTER: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_EYE_OUTER]),
    LEFT_EAR: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_EAR]),
    RIGHT_EAR: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_EAR]),
    MOUTH_LEFT: parseLandmark(landmarks[PoseLandmarkerPoint.MOUTH_LEFT]),
    MOUTH_RIGHT: parseLandmark(landmarks[PoseLandmarkerPoint.MOUTH_RIGHT]),
    LEFT_SHOULDER: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_SHOULDER]),
    RIGHT_SHOULDER: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_SHOULDER]),
    LEFT_ELBOW: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_ELBOW]),
    RIGHT_ELBOW: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_ELBOW]),
    LEFT_WRIST: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_WRIST]),
    RIGHT_WRIST: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_WRIST]),
    LEFT_PINKY: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_PINKY]),
    RIGHT_PINKY: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_PINKY]),
    LEFT_INDEX: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_INDEX]),
    RIGHT_INDEX: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_INDEX]),
    LEFT_THUMB: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_THUMB]),
    RIGHT_THUMB: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_THUMB]),
    LEFT_HIP: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_HIP]),
    RIGHT_HIP: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_HIP]),
    LEFT_KNEE: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_KNEE]),
    RIGHT_KNEE: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_KNEE]),
    LEFT_ANKLE: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_ANKLE]),
    RIGHT_ANKLE: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_ANKLE]),
    LEFT_HEEL: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_HEEL]),
    RIGHT_HEEL: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_HEEL]),
    LEFT_FOOT_INDEX: parseLandmark(landmarks[PoseLandmarkerPoint.LEFT_FOOT_INDEX]),
    RIGHT_FOOT_INDEX: parseLandmark(landmarks[PoseLandmarkerPoint.RIGHT_FOOT_INDEX]),
  };
}

export type PoseLandmarkState = ReturnType<typeof createPoseLandmarkState>;