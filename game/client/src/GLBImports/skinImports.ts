import stoveUrl from "@glb/skinsSelect/stove.glb";
import zombieUrl from "@glb/skinsSelect/zombie.glb";
import ogStoveUrl from "@glb/skinsSelect/og_stove.glb";
import brother from "@glb/skinsSelect/brother.glb";
import { useGLTF } from "@react-three/drei";

useGLTF.preload(stoveUrl, true, true);
useGLTF.preload(zombieUrl, true, true);
useGLTF.preload(ogStoveUrl, true, true);
useGLTF.preload(brother, true, true);

export const skinsUrls = {
  stoveUrl,
  zombieUrl,
  ogStoveUrl,
  brother,
};
