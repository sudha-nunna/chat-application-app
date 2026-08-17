import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import AnimationManager from "./AnimationManager";

/**
 * EnterpriseHumanoidAvatar.jsx
 * Professional Corporate AI Assistant 3D Avatar.
 * Features:
 * - Business casual blazer & collared shirt
 * - Shoulder-length clean realistic hair
 * - Thin professional eyeglasses (no gaming sunglasses)
 * - Friendly, trustworthy corporate assistant face
 * - Hands visible near thighs in natural relaxed standing pose
 * - Procedural breathing, head micro-movements, eye saccades & viseme lip-sync
 */
export const EnterpriseHumanoidAvatar = ({
  animRef,
  avatarState = "IDLE",
  currentViseme = "rest",
  sentimentText = "",
  cursorTarget = { x: 0, y: 0 },
  onLoaded
}) => {
  const { camera } = useThree();
  const avatarGroupRef = useRef(null);

  // Arm, Shoulder, Face & Eye Mesh Refs for AnimationManager
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const leftForearmRef = useRef(null);
  const rightForearmRef = useRef(null);
  const leftHandRef = useRef(null);
  const rightHandRef = useRef(null);
  const headGroupRef = useRef(null);
  const mouthRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const leftEyelidRef = useRef(null);
  const rightEyelidRef = useRef(null);

  // Set up Synthesia/Enterprise Assistant Camera Framing
  useEffect(() => {
    camera.position.set(0, 1.35, 1.40);
    camera.lookAt(0, 1.25, 0);
    camera.fov = 30;
    camera.updateProjectionMatrix();

    if (onLoaded) onLoaded();
  }, [camera, onLoaded]);

  return (
    <group ref={avatarGroupRef} name="EnterpriseCorporateAIAvatar" position={[0, 0, 0]}>
      {/* ==================== HEAD & FACE ==================== */}
      <group ref={headGroupRef} position={[0, 1.44, 0]}>
        {/* Head Base / Face Structure */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#f0c8a0" roughness={0.42} metalness={0.05} />
        </mesh>

        {/* Chin & Jaw Contour */}
        <mesh position={[0, -0.10, 0.04]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.10, 0.18, 32]} />
          <meshStandardMaterial color="#ebd0b5" roughness={0.45} />
        </mesh>

        {/* Shoulder-Length Professional Corporate Hair */}
        {/* Top & Back Hair Volume */}
        <mesh position={[0, 0.04, -0.02]}>
          <sphereGeometry args={[0.235, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <meshStandardMaterial color="#221815" roughness={0.65} metalness={0.08} />
        </mesh>
        {/* Left Shoulder-Length Hair Strand */}
        <mesh position={[-0.18, -0.16, 0.02]} rotation={[0, 0.15, -0.1]}>
          <capsuleGeometry args={[0.07, 0.42, 16, 16]} />
          <meshStandardMaterial color="#221815" roughness={0.65} metalness={0.08} />
        </mesh>
        {/* Right Shoulder-Length Hair Strand */}
        <mesh position={[0.18, -0.16, 0.02]} rotation={[0, -0.15, 0.1]}>
          <capsuleGeometry args={[0.07, 0.42, 16, 16]} />
          <meshStandardMaterial color="#221815" roughness={0.65} metalness={0.08} />
        </mesh>

        {/* Eyebrows */}
        <mesh position={[-0.075, 0.065, 0.20]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.065, 0.008, 0.01]} />
          <meshStandardMaterial color="#1a120f" roughness={0.8} />
        </mesh>
        <mesh position={[0.075, 0.065, 0.20]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.065, 0.008, 0.01]} />
          <meshStandardMaterial color="#1a120f" roughness={0.8} />
        </mesh>

        {/* Eyes (Sclera, Iris, Pupil) */}
        {/* Left Eye */}
        <group ref={leftEyeRef} position={[-0.075, 0.02, 0.19]}>
          <mesh><sphereGeometry args={[0.032, 24, 24]} /><meshStandardMaterial color="#ffffff" roughness={0.1} /></mesh>
          <mesh position={[0, 0, 0.022]}><sphereGeometry args={[0.017, 24, 24]} /><meshBasicMaterial color="#1e3a8a" /></mesh>
          <mesh position={[0, 0, 0.030]}><sphereGeometry args={[0.008, 16, 16]} /><meshBasicMaterial color="#020617" /></mesh>
        </group>
        {/* Right Eye */}
        <group ref={rightEyeRef} position={[0.075, 0.02, 0.19]}>
          <mesh><sphereGeometry args={[0.032, 24, 24]} /><meshStandardMaterial color="#ffffff" roughness={0.1} /></mesh>
          <mesh position={[0, 0, 0.022]}><sphereGeometry args={[0.017, 24, 24]} /><meshBasicMaterial color="#1e3a8a" /></mesh>
          <mesh position={[0, 0, 0.030]}><sphereGeometry args={[0.008, 16, 16]} /><meshBasicMaterial color="#020617" /></mesh>
        </group>

        {/* Thin Professional Eyeglasses (Corporate Assistant Frames) */}
        <group position={[0, 0.022, 0.205]}>
          {/* Left Frame Rim */}
          <mesh position={[-0.075, 0, 0]}>
            <torusGeometry args={[0.036, 0.003, 12, 24]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Right Frame Rim */}
          <mesh position={[0.075, 0, 0]}>
            <torusGeometry args={[0.036, 0.003, 12, 24]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Bridge */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.03, 0.003, 0.003]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Lenses */}
          <mesh position={[-0.075, 0, 0.001]}>
            <circleGeometry args={[0.034, 24]} />
            <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={0.3} transparent roughness={0.05} />
          </mesh>
          <mesh position={[0.075, 0, 0.001]}>
            <circleGeometry args={[0.034, 24]} />
            <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={0.3} transparent roughness={0.05} />
          </mesh>
        </group>

        {/* Nose */}
        <mesh position={[0, -0.02, 0.215]} rotation={[0.3, 0, 0]}>
          <coneGeometry args={[0.016, 0.045, 16]} />
          <meshStandardMaterial color="#ebd0b5" roughness={0.5} />
        </mesh>

        {/* Lips & Viseme Mouth Cavity */}
        <mesh ref={mouthRef} position={[0, -0.09, 0.198]}>
          <boxGeometry args={[0.075, 0.018, 0.015]} />
          <meshStandardMaterial color="#be123c" roughness={0.3} emissive="#881337" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* ==================== TORSO & CORPORATE OUTFIT ==================== */}
      {/* Neck */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 0.14, 32]} />
        <meshStandardMaterial color="#f0c8a0" roughness={0.45} />
      </mesh>

      {/* Executive Inner White Blouse / Shirt */}
      <mesh position={[0, 1.08, 0.01]}>
        <cylinderGeometry args={[0.15, 0.24, 0.26, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
      {/* Collared V-Neck Detail */}
      <mesh position={[0, 1.14, 0.12]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.09, 0.12, 0.02]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* Tailored Dark Navy Business Suit Blazer */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 0.55, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.15} />
      </mesh>
      {/* Blazer Lapel Accents */}
      <mesh position={[-0.12, 1.05, 0.12]} rotation={[0.2, 0.1, -0.2]}>
        <boxGeometry args={[0.06, 0.25, 0.03]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>
      <mesh position={[0.12, 1.05, 0.12]} rotation={[0.2, -0.1, 0.2]}>
        <boxGeometry args={[0.06, 0.25, 0.03]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      {/* Corporate Pants / Lower Body */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.28, 0.25, 0.55, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* ==================== ARMS & HANDS (RELAXED STANDING POSE NEAR THIGHS) ==================== */}
      {/* Left Upper Arm */}
      <group ref={leftArmRef} position={[-0.26, 1.15, 0]} rotation={[0.04, 0.06, -1.45]}>
        <mesh position={[0, -0.20, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.40, 24]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} />
        </mesh>
        {/* Left Forearm */}
        <group ref={leftForearmRef} position={[0, -0.40, 0]} rotation={[0.08, 0, -0.12]}>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.048, 0.038, 0.36, 24]} />
            <meshStandardMaterial color="#1e293b" roughness={0.65} />
          </mesh>
          {/* Left Hand Visible Near Thigh */}
          <group ref={leftHandRef} position={[0, -0.38, 0]} rotation={[0.03, 0.04, -0.04]}>
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.045, 0.10, 0.025]} />
              <meshStandardMaterial color="#f0c8a0" roughness={0.45} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Right Upper Arm */}
      <group ref={rightArmRef} position={[0.26, 1.15, 0]} rotation={[0.04, -0.06, 1.45]}>
        <mesh position={[0, -0.20, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.40, 24]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} />
        </mesh>
        {/* Right Forearm */}
        <group ref={rightForearmRef} position={[0, -0.40, 0]} rotation={[0.08, 0, 0.12]}>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.048, 0.038, 0.36, 24]} />
            <meshStandardMaterial color="#1e293b" roughness={0.65} />
          </mesh>
          {/* Right Hand Visible Near Thigh */}
          <group ref={rightHandRef} position={[0, -0.38, 0]} rotation={[0.03, -0.04, 0.04]}>
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.045, 0.10, 0.025]} />
              <meshStandardMaterial color="#f0c8a0" roughness={0.45} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Animation Kinematics Coordinator */}
      <AnimationManager
        ref={animRef}
        gltfModel={avatarGroupRef.current}
        avatarState={avatarState}
        currentViseme={currentViseme}
        sentimentText={sentimentText}
        cursorTarget={cursorTarget}
      />
    </group>
  );
};

export default EnterpriseHumanoidAvatar;
