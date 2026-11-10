import { FaceLandmarkerEstimation } from "@/computer-vision/face-landmarker";



const face = new FaceLandmarkerEstimation();
face.loadFaceLandmarkerDetector();

self.onmessage = async (event) => {
  const { id, type, payload }: {id: number, type: string, payload: ImageBitmap} = event.data;

  // const result = `Task Type: ${type}; Image width: ${payload.width}, image height: ${payload.height}`;
  const result = await face.estimateFace(payload);

  // Send the result back to the main thread
  self.postMessage({ id, result });
};