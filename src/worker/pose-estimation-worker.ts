import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";



export class PoseEstimationWorker {
  public worker: Worker;
  public requests = new Map();
  public isEnabled = false;
  public isProcessing = false;
  public idCounter = 0;

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

  async post(type: string, payload: unknown): Promise<PoseLandmarkerResult | null> {
    if (!this.isEnabled) return new Promise((resolve) => resolve(null));
    return new Promise((resolve) => {
      const id = ++this.idCounter;
      this.requests.set(id, resolve);
      this.worker.postMessage({ id, type, payload });
    });
  }

  enableWorker() {
    this.isEnabled = true;
  }

  disableWorker() {
    this.isEnabled = false;
  }
}