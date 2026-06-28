import emitter from "./EventEmitter";

export class CState<T> {
  private readonly eventName: string;
  val: T;

  constructor(name: string, val: T) {
    if (!name || !name.trim()) {
      throw new Error("Name cannot be empty");
    }
    this.eventName = "CState_e_" + name.replace(/\s/g, "");
    this.val = val;
  }

  setVal(value: T) {
    this.val = value;
  }

  sendEvent(value?: T): void {
    emitter.emit(this.eventName, value !== undefined ? value : this.val);
  }

  addListener(functionToCall: (value: T) => void) {
    return emitter.addListener(this.eventName, functionToCall);
  }
}
