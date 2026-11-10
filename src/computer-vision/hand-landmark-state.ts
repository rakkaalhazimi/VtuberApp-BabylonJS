import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";


import { HandLandmarkerEstimation, HandLandmarkerPoint } from "./hand-landmarker";
import { parseLandmark } from "@/utils";



export function createHandLandmarkState(hand: HandLandmarkerResult, isRight = true) {
  let handLandmarks = undefined;
  if (isRight) {
    handLandmarks = HandLandmarkerEstimation.GetRightHand(hand);
  } else {
    handLandmarks = HandLandmarkerEstimation.GetLeftHand(hand);
  }

  if (!handLandmarks) return;

  return {
    WRIST: parseLandmark(handLandmarks[HandLandmarkerPoint.WRIST]),
    THUMB_CMC: parseLandmark(handLandmarks[HandLandmarkerPoint.THUMB_CMC]),
    THUMB_MCP: parseLandmark(handLandmarks[HandLandmarkerPoint.THUMB_MCP]),
    THUMB_IP: parseLandmark(handLandmarks[HandLandmarkerPoint.THUMB_IP]),
    THUMB_TIP: parseLandmark(handLandmarks[HandLandmarkerPoint.THUMB_TIP]),
    INDEX_FINGER_MCP: parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_MCP]),
    INDEX_FINGER_PIP: parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_PIP]),
    INDEX_FINGER_DIP: parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_DIP]),
    INDEX_FINGER_TIP: parseLandmark(handLandmarks[HandLandmarkerPoint.INDEX_FINGER_TIP]),
    MIDDLE_FINGER_MCP: parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_MCP]),
    MIDDLE_FINGER_PIP: parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_PIP]),
    MIDDLE_FINGER_DIP: parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_DIP]),
    MIDDLE_FINGER_TIP: parseLandmark(handLandmarks[HandLandmarkerPoint.MIDDLE_FINGER_TIP]),
    RING_FINGER_MCP: parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_MCP]),
    RING_FINGER_PIP: parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_PIP]),
    RING_FINGER_DIP: parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_DIP]),
    RING_FINGER_TIP: parseLandmark(handLandmarks[HandLandmarkerPoint.RING_FINGER_TIP]),
    PINKY_MCP: parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_MCP]),
    PINKY_PIP: parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_PIP]),
    PINKY_DIP: parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_DIP]),
    PINKY_TIP: parseLandmark(handLandmarks[HandLandmarkerPoint.PINKY_TIP]),
  };
}

export type HandLandmarkState = ReturnType<typeof createHandLandmarkState>;