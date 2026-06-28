"use client";

import React, {
  memo,
  Suspense,
  useState,
  useRef,
  useMemo,
  useEffect,
  useTransition,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { GLBModel, GreenParticles, type pathTypes } from "@/components/glb/Model";
import * as THREE from "three";
import {
  EffectComposer,
  Bloom,
  SMAA,
  DepthOfField,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { ModelV1 } from "@/components/glb/Model";
const colorGreen = "#0ec630";

/** Catches `useGLTF` fetch rejections that Suspense alone wouldn't catch. */
class ModelErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Failed to load 3D model asset:", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const LoadingModel = memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime();
    const sinTime1 = Math.sin(time * 0.8);
    const sinTime2 = Math.sin(time * 2);
    const sinTime3 = Math.sin(time * 3);
    const sinTime4 = Math.sin(time * 4);
    const cosTime = Math.cos(time * 0.3);

    const mesh = meshRef.current;
    mesh.rotation.x = sinTime1 * 0.15;
    mesh.rotation.y = time * 1.15;
    mesh.rotation.z = cosTime * 0.15;
    mesh.position.y = sinTime2 * 0.1;
    mesh.position.x = Math.sin(time * 1.5) * 0.05;

    const scale = 1.2 + sinTime3 * 0.15;
    mesh.scale.set(scale, scale, scale);

    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + sinTime4 * 0.5;
      glowRef.current.distance = 3 + sinTime2 * 0.5;
    }
  });

  return (
    <group>
      <pointLight
        ref={glowRef}
        color={colorGreen}
        intensity={2}
        distance={3}
        decay={2}
        position={[0, 0, 0]}
      />

      <mesh ref={meshRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={colorGreen}
          wireframe
          emissive={colorGreen}
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
});

LoadingModel.displayName = "LoadingModel";

const LoadingParticles = memo(() => {
  const particlesRef = useRef<THREE.Points>(null);

  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 400;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = (Math.random() - 0.5) * 8;
      positions[i + 2] = (Math.random() - 0.5) * 8;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const time = clock.getElapsedTime();
    particlesRef.current.rotation.y = time * 0.2;
    particlesRef.current.rotation.x = Math.sin(time * 0.5) * 0.2;
  });

  return (
    <points ref={particlesRef}>
      <primitive object={particlesGeometry} />
      <pointsMaterial
        size={0.03}
        color={colorGreen}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
});

LoadingParticles.displayName = "LoadingParticles";
interface ModelViewerProps {
  url: pathTypes | string;
  isPopup?: boolean;
  isV1Collection?: boolean;
  quality?: "standard" | "high";
}

interface QualitySettings {
  dpr: [number, number];
  shadows: boolean;
  gl: {
    antialias: boolean;
    alpha?: boolean;
    precision: "lowp" | "mediump" | "highp";
    powerPreference: "default" | "high-performance" | "low-power";
    flat?: boolean;
    logarithmicDepthBuffer?: boolean;
  };
  ambientIntensity: number;
  pointLightIntensity: number;
  particleCount: number;
  postProcessing: {
    enabled: boolean;
    bloom?: {
      intensity: number;
      luminanceThreshold: number;
      luminanceSmoothing: number;
    };
    vignette?: {
      darkness: number;
      offset: number;
    };
    toneMapping?: {
      mode: ToneMappingMode;
      adaptive: boolean;
      resolution: number;
      middleGrey: number;
      whitePoint: number;
    };
  };
}

const ResizeHandler = () => {
  const { gl } = useThree();

  useEffect(() => {
    const handleResize = () => {
      const parent = gl.domElement.parentElement;
      if (parent) {
        gl.setSize(parent.clientWidth, parent.clientHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 0);

    return () => window.removeEventListener("resize", handleResize);
  }, [gl]);

  return null;
};

const QualitySwitch = memo(
  ({
    quality,
    onQualityChange,
  }: {
    quality: "standard" | "high";
    onQualityChange: (newQuality: "standard" | "high") => void;
  }) => {
    const t = useTranslations("nft");
    return (
      <div className="absolute bottom-3 right-3 z-10">
        <button
          onClick={() => {
            const newQuality = quality === "standard" ? "high" : "standard";
            onQualityChange(newQuality);
          }}
          className="relative flex items-center w-16 h-7 rounded-full shadow-xl transition-all duration-500 ease-in-out overflow-hidden backdrop-blur-sm"
          aria-label={t("switchTo", {
            quality: quality === "standard" ? t("high") : t("standard"),
          })}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm   -translate-x-1 -translate-y-1 h-20 w-20" />

          <div
            className={`
              absolute inset-0 transition-all duration-500 ease-in-out
              ${
                quality === "high"
                  ? "bg-gradient-to-r from-primary/40 via-primary/80 to-primary/40 opacity-100"
                  : "opacity-0"
              }
            `}
          />

          <div
            className={`
              absolute inset-0 transition-all duration-500 ease-in-out
              ${
                quality === "high"
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-90"
              }
              bg-primary/20 blur-md
            `}
          />

          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
            <span
              className={`
              text-xs font-semibold transition-all duration-300 ease-in-out
              ${quality === "high" ? "opacity-50" : "opacity-90"}
              text-white/90
            `}
            >
              {t("standard")}
            </span>
            <span
              className={`
              text-xs font-semibold transition-all duration-300 ease-in-out
              ${quality === "high" ? "opacity-90" : "opacity-50"}
              text-white/90
            `}
            >
              {t("high")}
            </span>
          </div>

          <div
            className={`
              absolute w-5 h-5 rounded-full flex items-center justify-center
              transform transition-all duration-500 ease-in-out z-10
              ${
                quality === "high"
                  ? "translate-x-10 bg-primary shadow-[0_0_8px_rgba(14,198,48,0.8)]"
                  : "translate-x-1 bg-white shadow-[0_0_5px_rgba(255,255,255,0.5)]"
              }
            `}
          />
        </button>
      </div>
    );
  },
);

QualitySwitch.displayName = "QualitySwitch";

const saveQualitySetting = (quality: "standard" | "high") => {
  try {
    localStorage.setItem("nft-viewer-quality", quality);
  } catch {
    // localStorage may be unavailable (private mode, blocked storage).
  }
};

const getSavedQualitySetting = (): "standard" | "high" => {
  try {
    const saved = localStorage.getItem("nft-viewer-quality");
    return saved === "high" ? "high" : "standard";
  } catch {
    return "standard";
  }
};

const BloomEffect = memo(({ settings }: { settings: QualitySettings }) => {
  if (!settings.postProcessing.bloom) return null;
  return (
    <Bloom
      intensity={settings.postProcessing.bloom.intensity}
      luminanceThreshold={settings.postProcessing.bloom.luminanceThreshold}
      luminanceSmoothing={settings.postProcessing.bloom.luminanceSmoothing}
    />
  );
});

const ToneMappingEffect = memo(
  ({ settings }: { settings: QualitySettings }) => {
    if (!settings.postProcessing.toneMapping) return null;
    return (
      <ToneMapping
        mode={settings.postProcessing.toneMapping.mode}
        adaptive={settings.postProcessing.toneMapping.adaptive}
        resolution={settings.postProcessing.toneMapping.resolution}
        middleGrey={settings.postProcessing.toneMapping.middleGrey}
        whitePoint={settings.postProcessing.toneMapping.whitePoint}
      />
    );
  },
);

BloomEffect.displayName = "BloomEffect";
ToneMappingEffect.displayName = "ToneMappingEffect";

const ModelScene = memo(
  ({
    url,
    isPopup,
    isV1Collection,
    quality,
    qualitySettings,
  }: {
    url: pathTypes | string;
    isPopup: boolean;
    isV1Collection: boolean;
    quality: "standard" | "high";
    qualitySettings: QualitySettings;
  }) => {
    return (
      <>
        <ResizeHandler />
        <ambientLight
          intensity={isV1Collection ? qualitySettings.ambientIntensity : 1}
        />
        {isPopup ? (
          <>
            <GreenParticles count={qualitySettings.particleCount} />
            <pointLight
              position={[0, 2, 0]}
              intensity={qualitySettings.pointLightIntensity}
              color={isV1Collection ? "#ddffdd" : colorGreen}
              castShadow={qualitySettings.shadows}
            />
          </>
        ) : (
          <GreenParticles count={qualitySettings.particleCount / 5} />
        )}
        <ModelErrorBoundary
          fallback={
            <>
              <LoadingModel />
              <LoadingParticles />
            </>
          }
        >
          <Suspense
            fallback={
              <>
                <LoadingModel />
                <LoadingParticles />
              </>
            }
          >
            {isV1Collection ? (
              <ModelV1 nftPath={url as string} quality={quality} />
            ) : (
              <GLBModel path={url as "zombie" | "ogStove"} quality={quality} />
            )}
            <OrbitControls
              enableZoom={isPopup}
              enablePan={isPopup}
              enableRotate={isPopup}
              autoRotate
              autoRotateSpeed={8}
            />
          </Suspense>
        </ModelErrorBoundary>

        {qualitySettings.postProcessing.enabled && (
          <EffectComposer>
            <BloomEffect settings={qualitySettings} />
            <SMAA />
            <DepthOfField
              focusDistance={2}
              focalLength={0.9}
              bokehScale={1}
              height={1080}
            />
            <ToneMappingEffect settings={qualitySettings} />
          </EffectComposer>
        )}
      </>
    );
  },
);

ModelScene.displayName = "ModelScene";

export const ModelViewer = memo(
  ({
    url,
    isPopup = true,
    isV1Collection = false,
    quality: initialQuality = "standard",
  }: ModelViewerProps) => {
    const [quality, setQuality] = useState<"standard" | "high">(() => {
      const savedQuality = getSavedQualitySetting();
      return savedQuality || initialQuality;
    });

    const [, startTransition] = useTransition();

    const handleQualityChange = useCallback(
      (newQuality: "standard" | "high") => {
        startTransition(() => {
          setQuality(newQuality);

          saveQualitySetting(newQuality);

          const event = new CustomEvent("qualityChange", {
            detail: newQuality,
          });
          window.dispatchEvent(event);
        });
      },
      [],
    );

    const qualitySettings: QualitySettings = useMemo(() => {
      switch (quality) {
        case "high":
          return {
            dpr: [1, 2.5] as [number, number],
            shadows: true,

            gl: {
              antialias: true,
              alpha: true,
              precision: "highp" as const,
              powerPreference: "high-performance" as const,
              flat: true,
            },
            ambientIntensity: 1.8,
            pointLightIntensity: 1,
            particleCount: isPopup ? 800 : 200,
            postProcessing: {
              enabled: true,
              bloom: {
                intensity: isV1Collection ? 0.3 : 0.2,
                luminanceThreshold: 0.8,
                luminanceSmoothing: 0.1,
              },
              toneMapping: {
                mode: ToneMappingMode.UNCHARTED2,
                adaptive: true,
                resolution: 256,
                middleGrey: 1,
                whitePoint: 2,
              },
            },
          };
        case "standard":
        default:
          return {
            dpr: [1, 2] as [number, number],
            shadows: false,
            gl: {
              antialias: true,
              precision: "mediump" as const,
              powerPreference: "default" as const,
            },
            ambientIntensity: 1.2,
            pointLightIntensity: 2,
            particleCount: isPopup ? 400 : 100,
            postProcessing: {
              enabled: false,
            },
          };
      }
    }, [quality, isPopup, isV1Collection]);

    return (
      <div className="relative w-full h-full">
        {isPopup && (
          <QualitySwitch
            quality={quality}
            onQualityChange={handleQualityChange}
          />
        )}

        <Canvas
          className="w-full h-full bg-background"
          style={{
            pointerEvents: isPopup ? "auto" : "none",
            width: "100%",
            height: "100%",
            display: "block",
          }}
          dpr={qualitySettings.dpr}
          shadows={qualitySettings.shadows}
          gl={qualitySettings.gl}
          camera={{
            position: isV1Collection ? [0, 1.8, 6] : [0, 0.4, 2.5],
            fov: 60,
            near: 0.1,
            far: 500,
          }}
          key={`canvas-${quality}`}
        >
          <ModelScene
            url={url}
            isPopup={isPopup}
            isV1Collection={isV1Collection}
            quality={quality}
            qualitySettings={qualitySettings}
          />
        </Canvas>
      </div>
    );
  },
);

ModelViewer.displayName = "ModelViewer";

interface MediaViewerProps {
  url: string;
  imageUrl?: string;
  isPopup?: boolean;
  /** Eager-load the image (above-the-fold LCP candidates). */
  priority?: boolean;
}

const LoadingSpinner = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

LoadingSpinner.displayName = "LoadingSpinner";

export const MediaViewer = memo(
  ({ url, imageUrl, isPopup, priority }: MediaViewerProps) => {
    const t = useTranslations("nft");
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isVideo =
      url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".gif");

    const displayUrl = !hasError ? imageUrl || url : false;

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    const handleLoad = () => {
      setIsLoading(false);
    };

    if (isVideo && !hasError) {
      return (
        <div
          className={
            isPopup
              ? "relative aspect-square h-full mx-auto"
              : "relative w-full h-full"
          }
        >
          {isLoading && <LoadingSpinner />}
          <video
            src={url}
            autoPlay
            loop
            muted
            playsInline
            preload="all"
            onError={handleError}
            onLoadedData={handleLoad}
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        {displayUrl ? (
          <>
            {isLoading && <LoadingSpinner />}
            <Image
              src={displayUrl}
              alt={t("media.imageAlt")}
              fill
              priority={isPopup || priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover"
              onError={handleError}
              onLoad={handleLoad}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <Canvas className="w-full h-full" style={{ pointerEvents: "none" }}>
              <ambientLight intensity={0.5} />
              <pointLight
                position={[10, 10, 10]}
                intensity={1}
                color={colorGreen}
              />
              <GreenParticles />
              <Text
                fontSize={4}
                color={colorGreen}
                anchorX="center"
                anchorY="middle"
                position={[0, 1, -1]}
                letterSpacing={0.05}
                outlineWidth={0.2}
                strokeOpacity={1}
                outlineColor="#000000"
              >
                ?
              </Text>
              <Text
                fontSize={0.7}
                position={[0, -2.5, -2]}
                color={colorGreen}
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.05}
                outlineWidth={0.07}
                strokeOpacity={1}
                outlineColor="#000000"
              >
                {t("notFound")}
              </Text>
            </Canvas>
          </div>
        )}
      </div>
    );
  },
);

MediaViewer.displayName = "MediaViewer";
