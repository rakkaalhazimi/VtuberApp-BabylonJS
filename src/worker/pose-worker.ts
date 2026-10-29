import { PoseLandmarkerEstimation } from "@/computer-vision/pose-estimation";



const pose = new PoseLandmarkerEstimation();
await pose.loadPoseLandmarkerDetector();

self.onmessage = async (event) => {
  const { id, type, payload }: {id: number, type: string, payload: ImageBitmap} = event.data;

  // const result = `Task Type: ${type}; Image width: ${payload.width}, image height: ${payload.height}`;
  const result = await pose.estimatePose(payload);

  // Send the result back to the main thread
  self.postMessage({id, result });
};
