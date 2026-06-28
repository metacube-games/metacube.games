import React, { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload } from "@react-three/drei";
import { GLBModel } from "./GLBModel";
import "./styles.css";

const FOV = 70;
const LOADINGYPOS = 300;
const FAR = 1000;
const initialPos = [Math.random() * 30 - 32, 2, Math.random() * 30 - 32];

function App() {
  const [downloadJson, setDownloadJson] = useState(false);

  const handleClick = () => {
    setDownloadJson(true);
  };

  const [dpr, setDpr] = useState(window.devicePixelRatio);
  const [dprMultiplicator, setDprMultiplicator] = useState(0.8);

  useEffect(() => {
    setDpr(window.devicePixelRatio * dprMultiplicator);
    const handleResize = () => {
      setDpr(window.devicePixelRatio * dprMultiplicator);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [dprMultiplicator]);

  return (
    <div className="App">
      <div className={"fullscreen"}>
        <button onClick={handleClick}>Download JSON</button>
        <Canvas
          linear
          dpr={dpr}
          camera={{
            fov: FOV,
            far: FAR,
            position: [initialPos[0], LOADINGYPOS, initialPos[2]],
            rotation: [0, 0, 0],
          }}
          gl={{
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <Preload all />

          <Suspense fallback={null}>
            <ambientLight intensity={0.54} />
            <color attach="background" args={["white"]} />
            <GLBModel dlJson={downloadJson} />
            <OrbitControls />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export default App;
