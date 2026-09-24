export class VideoCamera {
  public video: HTMLVideoElement;
  public isEnable: boolean = false;

  constructor(videoId: string) {
    this.video = document.getElementById(videoId) as HTMLVideoElement;
  }

  async enableCamera(): Promise<HTMLVideoElement> {
    this.isEnable = true;
    if (navigator.mediaDevices) {
      const stream = await navigator.mediaDevices.getUserMedia({ "video": true });
      this.video.srcObject = stream;
    }
    return this.video;
  }

  async disableCamera() {
    this.isEnable = false;
    this.video.srcObject = null;
  }
}