import { useRef, useEffect, useState, startTransition } from "react";
import { DoubleSide, type Material, type Mesh } from "three";
import { useFrame } from "@react-three/fiber";
import { MeshWobbleMaterial } from "@react-three/drei";
import emitter from "../../../helpers/EventEmitter";
import { CISoundMng } from "../../../sound/soundFX";

// Subcomponent for the Shockwave effect
function ShockwaveEffect({ onComplete }: { onComplete: () => void }) {
  const shockwaveRef = useRef<Mesh<any>>(null!);
  const progress = useRef(0);

  useFrame((_, delta) => {
    if (shockwaveRef.current) {
      // Increase progress for the animation
      progress.current += delta * 0.2;
      const scale = 1 + progress.current * 300; // Grow quickly
      const opacity = Math.exp(1 - progress.current) - 1; // Fade out

      (shockwaveRef.current.material as Material).opacity = opacity;
      shockwaveRef.current.scale.set(scale, scale, scale);

      // Stop animation after reaching a large scale
      if (progress.current > 2) {
        onComplete();
      }
    }
  });

  return (
    <mesh ref={shockwaveRef} position={[128, 100, 128]}>
      <MeshWobbleMaterial
        color={"green"}
        transparent={true}
        factor={50}
        speed={2}
        side={DoubleSide}
      />
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

// Main component
export function Shockwave() {
  const [showShockwave, setShowShockwave] = useState(false);

  useEffect(() => {
    const triggerExplosion = () => {
      startTransition(() => {
        setShowShockwave(true); // Mount the ShockwaveEffect
        CISoundMng?.soundsFx.nuke.updateSound();
      });
    };

    const listener = emitter.addListener("changeLayer", triggerExplosion);

    return () => {
      listener.remove();
    };
  }, []);

  return (
    <>
      {showShockwave && (
        <ShockwaveEffect
          onComplete={() => {
            setShowShockwave(false); // Unmount after animation
          }}
        />
      )}
    </>
  );
}
