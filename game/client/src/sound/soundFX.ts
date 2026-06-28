import { useEffect } from "react";
import { type Camera, useThree } from "@react-three/fiber";
import * as THREE from "three";
import run from "./soundsOptimized/run.mp3";
import runGrass from "./soundsOptimized/run.mp3";
import walk from "./soundsOptimized/walk.mp3";
import walkGrass from "./soundsOptimized/walk.mp3";
import wind from "./soundsOptimized/wind.mp3";
import fly from "./soundsOptimized/fly.mp3";
import hitAir from "./soundsOptimized/hitAir.mp3";
import hitCube from "./soundsOptimized/hitCube.wav";
import breakCube from "./soundsOptimized/breakCube.mp3";
import jump from "./soundsOptimized/jump.mp3";
import moneyGained from "./soundsOptimized/moneyGained.mp3";
import enteringMenu from "./soundsOptimized/enteringMenu.mp3";
import hurt from "./soundsOptimized/Hurt_2.wav";
import dead from "./soundsOptimized/Sharp_Death_1.wav";
import spawner from "./soundsOptimized/Spawn_1.wav";
import nuke from "./soundsOptimized/nuke.mp3";
import bombSpawn from "./soundsOptimized/bombSpawn.mp3";
import bombExplode from "./soundsOptimized/bombExplode.mp3";
import birdsSinging from "./soundsOptimized/ambientsp.mp3";
import nftSound from "./soundsOptimized/nftReward.mp3";
import landing from "./soundsOptimized/Landing_1.wav";
import electricSound from "./soundsOptimized/electriZap.mp3";
import exitingMenu from "./soundsOptimized/Exiting_Menu_3.wav";
import upgradeOFM from "./soundsOptimized/Out_of_money_for_upgrades_1.wav";
import upgradeSC from "./soundsOptimized/Upgrade_1.wav";
import particlesMoving from "./soundsOptimized/Particles_Moving_A_2.wav";
import menuChange from "./soundsOptimized/Menu_Entry_2.wav";
import achievement from "./soundsOptimized/achievment.wav";

import { type T3DP } from "../Types/T3DP";
import { CISettingsMng } from "../menu/subMenus/NavigationBar/Model/CSettingsManager";
import { Howl, Howler, type HowlOptions } from "howler";

class CNormalSound {
  public sound: Howl;
  public baseVolume: number;

  constructor(params: HowlOptions & { volume: number }) {
    this.sound = new Howl(params);
    this.baseVolume = params.volume;
  }

  updateSound() {
    if (!this.sound.loop() && this.sound.playing()) {
      this.sound.stop();
      this.sound.play();
    } else if (!this.sound.playing()) {
      this.sound.play();
    }
  }

  stopSound() {
    this.sound.stop();
  }
}

class CSpatialSound {
  public sound: Howl;
  baseVolume: number;
  camera: Camera;
  private objectVec: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private inverseCameraQuaternion = new THREE.Quaternion();

  constructor(
    params: HowlOptions & { volume: number },
    camera: Camera,
    nbEntities: number = 1,
  ) {
    // below is placeHolder
    if (nbEntities > 1) {
      nbEntities = 1;
    }
    this.sound = new Howl(params);
    this.baseVolume = params.volume;
    // if camera is added the sound will be spatial
    this.camera = camera;
  }

  updateSound(objectPos: T3DP) {
    this.objectVec.set(...objectPos);
    this.direction.subVectors(this.objectVec, this.camera.position);

    const distance = this.direction.length();

    // Exponential attenuation
    // Adjust the 'attenuationFactor' to control how quickly the sound fades
    const attenuationFactor = 0.1; // Example value, adjust as needed
    let volume = this.baseVolume * Math.exp(-attenuationFactor * distance) * 2;

    // Set the volume
    const volumeFX = CISoundMng?.volumeFx || 1;
    this.sound.volume(volume * volumeFX);

    // Compute the conjugate in-place and avoid object creation
    this.inverseCameraQuaternion.copy(this.camera.quaternion).conjugate();

    // Use the optimized quaternion directly without creating a new one
    const localDirection = this.direction
      .applyQuaternion(this.inverseCameraQuaternion)
      .normalize();

    this.sound.orientation(...localDirection.toArray());
    this.sound.pos(...this.direction.toArray());

    this.playSound();
  }

  private playSound() {
    if (!this.sound.loop() && this.sound.playing()) {
      this.sound.stop();
      this.sound.play();
    } else if (!this.sound.playing()) {
      this.sound.play();
    }
  }

  stopSound() {
    if (this.sound.playing()) {
      this.sound.stop();
    }
  }
}

class CSoundMng {
  volumeFx: number;
  volumeAmbient: number;
  // Ambient sounds ---------------------------------------------------------------------
  private soundsAmbient = {
    birdsSinging: new CNormalSound({
      src: [birdsSinging],
      autoplay: true,
      loop: true,
      volume: 0.5,
    }),
    wind: new CNormalSound({
      src: [wind],
      autoplay: true,
      loop: true,
      volume: 0.5,
    }),
  };
  soundsFx: {
    run: CSpatialSound;
    runGrass: CSpatialSound;
    walk: CSpatialSound;
    walkGrass: CSpatialSound;
    fly: CSpatialSound;
    hitAir: CSpatialSound;
    hitCube: CSpatialSound;
    hitFisc: CSpatialSound;
    breakCube: CSpatialSound;
    jump: CSpatialSound;
    landing: CSpatialSound;
    spawner: CSpatialSound;
    particlesMoving: CSpatialSound;
    bombSpawn: CSpatialSound;
    bombExplode: CSpatialSound;

    moneyGained: CSpatialSound;
    enteringMenu: CNormalSound;
    exitingMenu: CNormalSound;
    upgradeOFM: CNormalSound;
    upgradeSC: CNormalSound;
    hurt: CNormalSound;
    dead: CNormalSound;
    menuChange: CNormalSound;
    electricSound: CNormalSound;
    nftSound: CNormalSound;
    achievement: CNormalSound;
    nuke: CNormalSound;
  };
  constructor(camera: Camera, fxVolume: number, ambientVolume: number) {
    this.volumeFx = fxVolume;
    this.volumeAmbient = ambientVolume;

    // Fx sounds ---------------------------------------------------------------------
    this.soundsFx = {
      run: new CSpatialSound({ src: [run], loop: true, volume: 1 }, camera),
      runGrass: new CSpatialSound(
        { src: [runGrass], loop: true, volume: 1 },
        camera,
      ),
      walk: new CSpatialSound({ src: [walk], loop: true, volume: 1 }, camera),
      walkGrass: new CSpatialSound(
        { src: [walkGrass], loop: true, volume: 1 },
        camera,
      ),
      fly: new CSpatialSound({ src: [fly], loop: true, volume: 0.5 }, camera),
      hitAir: new CSpatialSound({ src: [hitAir], volume: 0.4 }, camera),
      hitCube: new CSpatialSound({ src: [hitCube], volume: 0.4 }, camera),
      hitFisc: new CSpatialSound({ src: [hitCube], volume: 0.4 }, camera),
      breakCube: new CSpatialSound({ src: [breakCube], volume: 0.5 }, camera),
      jump: new CSpatialSound({ src: [jump], volume: 0.5 }, camera),
      landing: new CSpatialSound({ src: [landing], volume: 0.15 }, camera),
      moneyGained: new CSpatialSound(
        { src: [moneyGained], volume: 0.5 },
        camera,
      ),

      spawner: new CSpatialSound({ src: [spawner], volume: 0.5 }, camera),
      particlesMoving: new CSpatialSound(
        { src: [particlesMoving], volume: 0.5 },
        camera,
        6,
      ),
      bombSpawn: new CSpatialSound({ src: [bombSpawn], volume: 0.6 }, camera),
      bombExplode: new CSpatialSound(
        { src: [bombExplode], volume: 0.7 },
        camera,
      ),

      enteringMenu: new CNormalSound({ src: [enteringMenu], volume: 0.3 }),
      exitingMenu: new CNormalSound({ src: [exitingMenu], volume: 0.3 }),
      upgradeOFM: new CNormalSound({ src: [upgradeOFM], volume: 0.5 }),
      upgradeSC: new CNormalSound({ src: [upgradeSC], volume: 0.3 }),
      hurt: new CNormalSound({ src: [hurt], volume: 0.15 }),
      dead: new CNormalSound({ src: [dead], volume: 0.25 }),
      menuChange: new CNormalSound({
        src: [menuChange],
        volume: 0.3,
      }),
      electricSound: new CNormalSound({
        src: [electricSound],
        volume: 0.3,
      }),
      nftSound: new CNormalSound({ src: [nftSound], volume: 1 }),
      achievement: new CNormalSound({ src: [achievement], volume: 0.5 }),
      nuke: new CNormalSound({ src: [nuke], volume: 0.5 }),
    };
  }

  updateFxVolume() {
    this.volumeFx = CISettingsMng.audio.fxVolume.getVal();
    // loop over all soundFx objects and update their volume
    Object.entries(this.soundsFx).forEach(([, soundObj]) => {
      soundObj.sound.volume(soundObj.baseVolume * this.volumeFx);
    });
  }

  updateAmbientVolume() {
    this.volumeAmbient = CISettingsMng.audio.ambientVolume.getVal();
    // loop over all soundAmbient objects and update their volume

    Object.entries(this.soundsAmbient).forEach(([, soundObj]) => {
      soundObj.sound.volume(soundObj.baseVolume * this.volumeAmbient);
    });
  }

  stopAllInGameFXSounds() {
    Object.entries(this.soundsFx).forEach(([key, soundObj]) => {
      if (key !== "enteringMenu") {
        soundObj.stopSound();
      }
    });
  }

  stopAllFXSounds() {
    Object.entries(this.soundsFx).forEach(([, soundObj]) => {
      soundObj.stopSound();
    });
  }

  setGlobalVolume() {
    const globalVolume = CISettingsMng.audio.masterVolume.getVal();
    Howler.volume(globalVolume);
  }
}

export let CISoundMng: CSoundMng | null = null;

export const useSoundFX = () => {
  const { camera } = useThree();
  if (CISoundMng === null) {
    const fxVolume = CISettingsMng.audio.fxVolume.getVal();
    const musicVolume = CISettingsMng.audio.ambientVolume.getVal();
    CISoundMng = new CSoundMng(camera, fxVolume, musicVolume);
    CISoundMng.setGlobalVolume();
    CISoundMng.updateFxVolume();
    CISoundMng.updateAmbientVolume();
  }
  useEffect(() => {
    const updateAmbientVolume = () => {
      CISoundMng?.updateAmbientVolume();
    };

    const updateFxVolume = () => {
      CISoundMng?.updateFxVolume();
    };

    const globalVolume = () => {
      CISoundMng?.setGlobalVolume();
    };

    const listenerGlobal =
      CISettingsMng.audio.masterVolume.addListener(globalVolume);

    const listenerFX = CISettingsMng.audio.fxVolume.addListener(updateFxVolume);

    const listenerMusic =
      CISettingsMng.audio.ambientVolume.addListener(updateAmbientVolume);

    return () => {
      listenerFX.remove();
      listenerMusic.remove();
      listenerGlobal.remove();
    };
  }, []);
};
