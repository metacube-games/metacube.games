import { type AxiosProgressEvent } from "axios";
import { CState } from "../../helpers/CState";

class CLoading {
  loadingProgress: CState<number> = new CState<number>("loadingProgress", 0);
  private alreadyfakeLoaded = false;
  constructor() {
    this.progressFunc = this.progressFunc.bind(this);
  }

  progressFunc(progressEvent: AxiosProgressEvent) {
    if (progressEvent.total) {
      const percentCompleted =
        0.95 * Math.round((progressEvent.loaded * 100) / progressEvent.total);
      this.loadingProgress.sendEvent(percentCompleted);
      if (percentCompleted > 94.9) {
        this.autoFakeLoading(percentCompleted);
      }
    }
  }

  autoFakeLoading(percentCompleted: number) {
    if (this.alreadyfakeLoaded) return;
    this.alreadyfakeLoaded = true;
    this.loadingProgress.val = percentCompleted;
    const interval = setInterval(() => {
      this.loadingProgress.sendEvent(Math.min(++this.loadingProgress.val, 100));
      if (this.loadingProgress.val >= 100) {
        clearInterval(interval);
      }
    }, 100);

    // Safety cap: clear the interval after 2 s regardless of progress value.
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
      }
    }, 2000);
  }
}

export const CILoading = new CLoading();
