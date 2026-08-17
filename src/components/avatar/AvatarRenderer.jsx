import React, { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import AnimationManager from "./AnimationManager";
import PerformanceMonitor from "./PerformanceMonitor";

const DEFAULT_3D_MODEL = "/models/viverse_avatar_model_210287.vrm";

// GLTF / VRM Scene Loader Component
const LoadedGltfMesh = ({ targetPath, onSceneLoaded }) => {
  const gltf = useLoader(GLTFLoader, targetPath);
  const cloned = useMemo(() => (gltf && gltf.scene ? SkeletonUtils.clone(gltf.scene) : null), [gltf]);

  useEffect(() => {
    if (cloned) onSceneLoaded(cloned);
  }, [cloned, onSceneLoaded]);

  return null;
};

// FBX Scene Loader Component (Native Mixamo .fbx support with VRM fallback)
const LoadedFbxMesh = ({ targetPath, onSceneLoaded, onErrorFallback }) => {
  useEffect(() => {
    let isMounted = true;
    const loader = new FBXLoader();
    loader.load(
      targetPath,
      (fbx) => {
        if (isMounted && fbx) {
          const cloned = SkeletonUtils.clone(fbx);
          // Standardize Mixamo FBX unit scale (1 unit = 1cm = 0.01m)
          cloned.scale.setScalar(0.01);
          onSceneLoaded(cloned);
        }
      },
      undefined,
      (err) => {
        console.warn("FBX Load error (Unsupported FBX version or format, switching to VRM fallback):", err?.message || err);
        if (isMounted && onErrorFallback) onErrorFallback();
      }
    );
    return () => { isMounted = false; };
  }, [targetPath, onSceneLoaded, onErrorFallback]);

  return null;
};

// Photorealistic 3D Model Loader (.vrm, .glb & .fbx) & Camera Framing
const LoadedModelMesh = ({ modelUrl, onModelLoaded, animRef, avatarState, currentViseme, sentimentText, cursorTarget }) => {
  const { camera } = useThree();
  const [fallbackModelPath, setFallbackModelPath] = useState(null);

  let targetPath = fallbackModelPath || (modelUrl && !modelUrl.startsWith("preset:") ? modelUrl : DEFAULT_3D_MODEL);

  if (!targetPath || (!targetPath.endsWith(".vrm") && !targetPath.endsWith(".glb") && !targetPath.endsWith(".fbx"))) {
    targetPath = DEFAULT_3D_MODEL;
  }

  const isFbx = Boolean(targetPath && targetPath.toLowerCase().includes(".fbx"));
  const [activeScene, setActiveScene] = useState(null);

  useEffect(() => {
    if (!activeScene) return;

    // Enhance materials for realistic human skin & lighting
    activeScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.needsUpdate = true;
        if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
        if (child.material.roughness !== undefined) {
          child.material.roughness = Math.max(0.40, child.material.roughness);
        }
        if (child.material.metalness !== undefined) {
          child.material.metalness = Math.min(0.15, child.material.metalness);
        }
      }
    });

    const bbox = new THREE.Box3().setFromObject(activeScene);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());

    // Keep model root on ground (Y = 0) and centered on X/Z
    activeScene.position.set(-center.x, 0, -center.z);
    activeScene.rotation.y = Math.PI; // Rotate 180° to face front camera
    activeScene.updateMatrixWorld(true);

    let headWorldPos = new THREE.Vector3();
    let foundHeadBone = false;

    activeScene.traverse((node) => {
      if (node.isBone) {
        const nameLower = node.name.toLowerCase();
        if ((nameLower.includes("head") || nameLower.includes("avatar_head")) && !nameLower.includes("top")) {
          node.getWorldPosition(headWorldPos);
          foundHeadBone = true;
        }
      }
    });

    const headY = foundHeadBone ? headWorldPos.y : (size.y > 0.8 ? size.y * 0.83 : size.y * 0.52);
    const targetY = headY - 0.05;
    const camY = headY - 0.02;
    const camZ = 1.65;

    camera.position.set(0, camY, camZ);
    camera.lookAt(0, targetY, 0);
    camera.fov = 34;
    camera.updateProjectionMatrix();

    if (onModelLoaded) onModelLoaded();
  }, [activeScene, camera, onModelLoaded]);

  return (
    <>
      {isFbx ? (
        <LoadedFbxMesh
          targetPath={targetPath}
          onSceneLoaded={setActiveScene}
          onErrorFallback={() => setFallbackModelPath("/models/viverse_avatar_model_210287.vrm")}
        />
      ) : (
        <LoadedGltfMesh targetPath={targetPath} onSceneLoaded={setActiveScene} />
      )}

      {activeScene && (
        <>
          <primitive object={activeScene} />
          <AnimationManager
            ref={animRef}
            gltfModel={activeScene}
            avatarState={avatarState}
            currentViseme={currentViseme}
            sentimentText={sentimentText}
            cursorTarget={cursorTarget}
          />
        </>
      )}
    </>
  );
};

/**
 * AvatarRenderer.jsx
 * React Three Fiber Canvas with Studio Lighting & Modern Enterprise AI Assistant 3D Avatar.
 */
export const AvatarRenderer = ({
  modelUrl,
  avatarState = "IDLE",
  currentViseme = "rest",
  sentimentText = "",
  cursorTarget = { x: 0, y: 0 },
  onLoaded,
  animRef
}) => {
  const [loadError, setLoadError] = useState(false);

  // Check if a custom external user uploaded GLB file is specified
  const isCustomUploadedGlb = Boolean(
    modelUrl &&
    typeof modelUrl === "string" &&
    modelUrl.startsWith("http")
  );

  return (
    <Canvas
      camera={{ position: [0, 1.60, 1.55], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows
      className="w-full h-full"
    >
      <color attach="background" args={[0x070b14]} />

      {/* Photorealistic Studio Lighting Setup */}
      <ambientLight intensity={1.6} />
      <directionalLight position={[1.8, 2.5, 2.0]} intensity={2.8} castShadow />
      <directionalLight position={[-1.8, 1.5, 1.2]} intensity={1.4} color="#818cf8" />
      <directionalLight position={[0, 2.2, -1.8]} intensity={1.6} color="#c084fc" />
      <directionalLight position={[0, -1.5, 1.0]} intensity={0.6} color="#38bdf8" />

      {/* Performance Monitoring */}
      <PerformanceMonitor showOverlay={false} />

      {/* 3D Photorealistic Model Renderer */}
      <Suspense fallback={null}>
        <LoadedModelMesh
          modelUrl={modelUrl}
          onModelLoaded={onLoaded}
          animRef={animRef}
          avatarState={avatarState}
          currentViseme={currentViseme}
          sentimentText={sentimentText}
          cursorTarget={cursorTarget}
        />
      </Suspense>
    </Canvas>
  );
};

export default AvatarRenderer;
