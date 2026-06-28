import hammerSelfUrl from "@glb/weapons/HammerSelf.glb";
import hammerUrl from "@glb/weapons/Hammer.glb";
import { useGLTF } from "@react-three/drei";
import gunUrl from "@glb/weapons/gun.glb";

useGLTF.preload(hammerSelfUrl, true, true);
useGLTF.preload(gunUrl, true, true);
useGLTF.preload(hammerUrl, true, true);

export const weaponUrls = {
  hammerSelfUrl,
  hammerUrl,
  gunUrl,
};
