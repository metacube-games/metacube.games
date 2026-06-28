import { Sparkles, Stars } from "@react-three/drei";

export const AmbientParticles = () => {
  return (
    <>
      <Sparkles
        count={10000}
        size={10}
        color="green"
        speed={1}
        position={[110, 140, 90]}
        scale={[320, 280, 400]}
      />
      <Sparkles
        count={3000}
        size={10}
        color="red"
        speed={3}
        position={[128, 250, -52]}
        scale={[128, 500, 68]}
      />
      <Sparkles
        count={700}
        size={100}
        color="grey"
        speed={4}
        position={[128, -190, 128]}
        scale={[1000, 80, 1000]}
      />
      <Stars radius={1000} count={3000} speed={1} />
    </>
  );
};
