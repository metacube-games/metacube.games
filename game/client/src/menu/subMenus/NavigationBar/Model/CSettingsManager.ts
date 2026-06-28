import emitter from "../../../../helpers/EventEmitter";

class CSetting {
  private globalName: string = "MCS_";
  private ev: string = "e_";
  public name: string;
  public storeName: string;
  public eventName: string;
  public inputType: string;
  constructor(name: string, inputType: string) {
    this.name = name;
    const nameNoSpace = name.replace(/\s/g, "");
    const storeName = this.globalName + nameNoSpace;
    this.storeName = storeName;
    this.eventName = this.ev + nameNoSpace;
    this.inputType = inputType;
  }
}

export class CSettingSwitch extends CSetting {
  defaultValue: boolean;
  constructor(name: string, defaultValue: boolean) {
    super(name, "Switch");
    this.defaultValue = defaultValue;
  }

  getVal(): boolean {
    const stored = localStorage.getItem(this.storeName);
    if (stored === null) {
      return this.defaultValue;
    } else {
      return stored !== "false";
    }
  }

  sendEvent(value: boolean): void {
    emitter.emit(this.eventName, value);
  }

  addListener(functionToCall: (value: boolean) => void) {
    return emitter.addListener(this.eventName, functionToCall);
  }

  storeValue(value: boolean): void {
    localStorage.setItem(this.storeName, String(value));
  }
}

export class CSettingSlider extends CSetting {
  public min: number;
  public max: number;
  public step: number;
  private defaultValue: number;
  constructor(
    name: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
  ) {
    super(name, "Slider");
    this.min = min;
    this.max = max;
    this.step = step;
    this.defaultValue = defaultValue;
  }

  getVal(): number {
    return Number(localStorage.getItem(this.storeName) || this.defaultValue);
  }

  sendEvent(value: number): void {
    emitter.emit(this.eventName, value);
  }

  addListener(functionToCall: (value: number) => void) {
    return emitter.addListener(this.eventName, functionToCall);
  }

  storeValue(value: number): void {
    localStorage.setItem(this.storeName, String(value));
  }
}

class CSettingsManager {
  public hud = {
    showFPS: new CSettingSwitch("FPS", true),
    showCoordinates: new CSettingSwitch("Coordinates", true),
    showTotCubes: new CSettingSwitch("Total blocks", true),
    showPlayers: new CSettingSwitch("Players", true),
    showEventBar: new CSettingSwitch("Events", true),
    showDamageMarker: new CSettingSwitch("Damages", true),
    showSpectator: new CSettingSwitch("Spectator", true),
  };
  public render = {
    resolution: new CSettingSlider("Resolution", 0.2, 2, 0.1, 1),
    renderDistance: new CSettingSlider("Render distance", 10, 250, 10, 250),
    fov: new CSettingSlider("Field of view", 60, 100, 5, 80),
    luminosity: new CSettingSlider("Luminosity", 0, 2, 0.1, 0.5),
    darkFutureAmbiance: new CSettingSwitch("Dark future ambiance", false),
    antialiasing: new CSettingSwitch("Antialiasing", false),
    fogsEffect: new CSettingSwitch("Fogs effects", true),
    particlesEffect: new CSettingSwitch("Particles effects", true),
    variousEffects: new CSettingSwitch("Spatial Objects", true),
    spaceCraft: new CSettingSwitch("Spacecraft", true),
    powerJauges: new CSettingSwitch("Power Jauges", true),
  };
  public controls = {
    cameraSensitivity: new CSettingSlider("Camera sensitivity", 0, 1, 0.1, 0.4),
  };
  public audio = {
    masterVolume: new CSettingSlider("Master volume", 0, 1, 0.1, 1),
    ambientVolume: new CSettingSlider("Ambient volume", 0, 1, 0.1, 0.5),
    fxVolume: new CSettingSlider("Fx volume", 0, 1, 0.1, 1),
  };
}

export const CISettingsMng = new CSettingsManager();
