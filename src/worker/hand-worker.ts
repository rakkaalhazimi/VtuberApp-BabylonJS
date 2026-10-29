import { HandLandmarkerEstimation } from "@/computer-vision/hand-landmarker";



const hand = new HandLandmarkerEstimation();
hand.loadHandLandmarkerDetector();

self.onmessage = async (event) => {
  const { id, type, payload }: {id: number, type: string, payload: ImageBitmap} = event.data;

  // const result = `Task Type: ${type}; Image width: ${payload.width}, image height: ${payload.height}`;
  const result = await hand.estimateHand(payload);

  // Send the result back to the main thread
  self.postMessage({id, result });
};