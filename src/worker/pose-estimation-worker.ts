import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";

import type { PoseLandmarkerDrawer } from "@/computer-vision/pose-drawer";
import type { MMDMovementGuider } from "@/mmd/guider";



export class PoseEstimationWorker {
  public worker: Worker;
  public requests = new Map();
  public isProcessing = false;
  public idCounter = 0;
  public guider: MMDMovementGuider | undefined;
  public drawer: PoseLandmarkerDrawer | undefined;

  constructor() {
    this.worker = new Worker(
      new URL('./pose-worker.js?workerUrl', import.meta.url),
      { type: 'module' },
    );
    this.worker.onmessage = (event) => {
      const { id, result } = event.data;
      if (this.requests.has(id)) {
        this.requests.get(id)(result);
        this.requests.delete(id);
      }
    };
  }

  addGuider(guider: MMDMovementGuider) {
    this.guider = guider;
  }

  addDrawer(drawer: PoseLandmarkerDrawer) {
    this.drawer = drawer;
  }

  async post(type: string, payload: unknown): Promise<PoseLandmarkerResult> {
    return new Promise((resolve) => {
      const id = ++this.idCounter;
      this.requests.set(id, resolve);
      this.worker.postMessage({ id, type, payload });
    });
  }
}