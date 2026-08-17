import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import LipSyncManager from "./LipSyncManager";
import ExpressionManager from "./ExpressionManager";
import EyeTrackingManager from "./EyeTrackingManager";
import HeadMovementManager from "./HeadMovementManager";

/**
 * AnimationManager.jsx
 * Advanced R3F animation coordinator.
 * - Poses T-pose skeleton arms into natural relaxed posture.
 * - Animates morph targets for RPM/ARKit models.
 * - Provides procedural 3D mouth cavity visemes for models without morph targets.
 * - Drives speech head nods, eye saccades, breathing, and sentiment expressions.
 */
export const AnimationManager = forwardRef(({
  gltfModel,
  avatarState = "IDLE",
  currentViseme = "rest",
  sentimentText = "",
  cursorTarget = { x: 0, y: 0 }
}, ref) => {
  const lipSyncRef = useRef(new LipSyncManager());
  const expressionRef = useRef(new ExpressionManager());
  const eyeTrackingRef = useRef(new EyeTrackingManager());
  const headMovementRef = useRef(new HeadMovementManager());

  // Cached model references
  const morphMeshesRef = useRef([]);
  const headBoneRef = useRef(null);
  const neckBoneRef = useRef(null);
  const jawBoneRef = useRef(null);
  const eyeBonesRef = useRef([]);
  const shoulderRestYRef = useRef({ left: 0, right: 0 });
  const spineRef = useRef(null);
  const leftShoulderRef = useRef(null);
  const rightShoulderRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const leftForearmRef = useRef(null);
  const rightForearmRef = useRef(null);
  const leftHandRef = useRef(null);
  const rightHandRef = useRef(null);

  // Procedural Mouth Cavity Mesh for models lacking built-in morph targets
  const proceduralMouthRef = useRef(null);
  const upperTeethRef = useRef(null);
  const lowerTeethRef = useRef(null);
  const [hasMorphTargets, setHasMorphTargets] = useState(true);

  useImperativeHandle(ref, () => ({
    setViseme: (shape) => lipSyncRef.current.setViseme(shape),
    setExpression: (exp) => expressionRef.current.setExpression(exp),
    triggerNod: (intensity) => headMovementRef.current.triggerNod(intensity),
    evaluateSentiment: (text) => expressionRef.current.evaluateSentiment(text)
  }));

  // Bind GLTF nodes & pose avatar into Professional Neutral Idle Standing Pose
  useEffect(() => {
    if (!gltfModel) return;

    morphMeshesRef.current = [];
    headBoneRef.current = null;
    neckBoneRef.current = null;
    jawBoneRef.current = null;
    spineRef.current = null;
    eyeBonesRef.current = [];
    leftShoulderRef.current = null;
    rightShoulderRef.current = null;
    leftArmRef.current = null;
    rightArmRef.current = null;
    leftForearmRef.current = null;
    rightForearmRef.current = null;
    leftHandRef.current = null;
    rightHandRef.current = null;
    shoulderRestYRef.current = { left: 0, right: 0 };

    gltfModel.traverse((node) => {
      if (node.isMesh && node.morphTargetDictionary && node.morphTargetInfluences && Object.keys(node.morphTargetDictionary).length > 0) {
        morphMeshesRef.current.push(node);
      }
      if (node.isBone) {
        const nameLower = node.name.toLowerCase();
        if ((nameLower.includes("head") || nameLower.includes("c_head") || nameLower.includes("avatar_head")) && !nameLower.includes("top")) headBoneRef.current = node;
        if (nameLower.includes("neck") || nameLower.includes("c_neck") || nameLower.includes("avatar_neck")) neckBoneRef.current = node;
        if (nameLower.includes("jaw")) jawBoneRef.current = node;
        if (nameLower.includes("spine") || nameLower.includes("chest") || nameLower.includes("c_spine")) spineRef.current = node;
        if ((nameLower.includes("eye") || nameLower.includes("faceeye") || nameLower.includes("avatar_eye")) && (nameLower.includes("left") || nameLower.includes("right") || nameLower.includes("l") || nameLower.includes("r"))) {
          eyeBonesRef.current.push(node);
        }

        // Cache shoulder, arm, forearm, and hand bones for neutral idle standing posture (GLTF, FBX, Mixamo, VRM, Viverse)
        if (nameLower.includes("leftshoulder") || nameLower.includes("l_shoulder") || nameLower.includes("avatar_leftshoulder") || (nameLower.includes("shoulder") && nameLower.includes("left"))) {
          leftShoulderRef.current = node;
          shoulderRestYRef.current.left = node.position.y;
        }
        if (nameLower.includes("rightshoulder") || nameLower.includes("r_shoulder") || nameLower.includes("avatar_rightshoulder") || (nameLower.includes("shoulder") && nameLower.includes("right"))) {
          rightShoulderRef.current = node;
          shoulderRestYRef.current.right = node.position.y;
        }
        if (nameLower.includes("l_upperarm") || nameLower.includes("leftarm") || nameLower.includes("left_arm") || nameLower.includes("avatar_leftarm") || (nameLower.includes("arm") && (nameLower.includes("left") || nameLower.includes("l_")) && !nameLower.includes("fore") && !nameLower.includes("lower") && !nameLower.includes("shoulder"))) {
          leftArmRef.current = node;
        }
        if (nameLower.includes("r_upperarm") || nameLower.includes("rightarm") || nameLower.includes("right_arm") || nameLower.includes("avatar_rightarm") || (nameLower.includes("arm") && (nameLower.includes("right") || nameLower.includes("r_")) && !nameLower.includes("fore") && !nameLower.includes("lower") && !nameLower.includes("shoulder"))) {
          rightArmRef.current = node;
        }
        if (nameLower.includes("l_lowerarm") || nameLower.includes("leftforearm") || nameLower.includes("forearm_l") || nameLower.includes("avatar_leftforearm") || (nameLower.includes("forearm") && nameLower.includes("left"))) {
          leftForearmRef.current = node;
        }
        if (nameLower.includes("r_lowerarm") || nameLower.includes("rightforearm") || nameLower.includes("forearm_r") || nameLower.includes("avatar_rightforearm") || (nameLower.includes("forearm") && nameLower.includes("right"))) {
          rightForearmRef.current = node;
        }
        if ((nameLower.includes("l_hand") || nameLower.includes("lefthand") || nameLower.includes("avatar_lefthand") || (nameLower.includes("hand") && nameLower.includes("left"))) && !nameLower.includes("finger") && !nameLower.includes("thumb")) {
          leftHandRef.current = node;
        }
        if ((nameLower.includes("r_hand") || nameLower.includes("righthand") || nameLower.includes("avatar_righthand") || (nameLower.includes("hand") && nameLower.includes("right"))) && !nameLower.includes("finger") && !nameLower.includes("thumb")) {
          rightHandRef.current = node;
        }
      }
    });

    const foundMorphs = morphMeshesRef.current.length > 0;
    setHasMorphTargets(foundMorphs);
  }, [gltfModel]);

  // Update Viseme Target
  useEffect(() => {
    lipSyncRef.current.setViseme(currentViseme);
  }, [currentViseme]);

  // Evaluate Sentiment
  useEffect(() => {
    if (sentimentText) {
      expressionRef.current.evaluateSentiment(sentimentText);
    }
  }, [sentimentText]);

  // Update Cursor Target
  useEffect(() => {
    eyeTrackingRef.current.setCursorTarget(cursorTarget.x, cursorTarget.y);
  }, [cursorTarget]);

  // 60 FPS R3F Frame Loop
  useFrame((state, delta) => {
    const elapsedTime = state.clock.getElapsedTime();

    // 0. Professional Neutral Idle Standing Posture & Procedural Breathing
    const breathCycle = Math.sin(elapsedTime * 2.0); // 2.0 rad/s smooth breathing wave
    const breathSway = Math.sin(elapsedTime * 1.2) * 0.008; // subtle organic sway
    const breathLift = breathCycle * 0.003; // 3mm shoulder/chest breathing elevation

    // Relaxed shoulders with subtle breathing motion relative to initial bind position
    if (leftShoulderRef.current) leftShoulderRef.current.position.y = shoulderRestYRef.current.left + breathLift;
    if (rightShoulderRef.current) rightShoulderRef.current.position.y = shoulderRestYRef.current.right + breathLift;

    if (spineRef.current) {
      spineRef.current.rotation.set(0.008 * breathCycle, 0, breathSway * 0.5, "XYZ");
    }

    // Detect whether model is VRM skeleton (J_Bip_L_UpperArm or Avatar_LeftArm) vs Mixamo skeleton
    const isVrmSkeleton = Boolean(
      (leftArmRef.current && (leftArmRef.current.name.toLowerCase().includes("j_bip") || leftArmRef.current.name.toLowerCase().includes("avatar_"))) ||
      (rightArmRef.current && (rightArmRef.current.name.toLowerCase().includes("j_bip") || rightArmRef.current.name.toLowerCase().includes("avatar_")))
    );

    // Arms resting naturally beside body
    if (leftArmRef.current) {
      if (isVrmSkeleton) {
        leftArmRef.current.rotation.set(0.04 + breathSway, 0, 1.25 - breathLift * 0.5, "XYZ");
      } else {
        leftArmRef.current.rotation.set(0.04 + breathSway, 0.06, -1.45 + breathLift * 0.5, "XYZ");
      }
    }
    if (rightArmRef.current) {
      if (isVrmSkeleton) {
        rightArmRef.current.rotation.set(0.04 - breathSway, 0, -1.25 + breathLift * 0.5, "XYZ");
      } else {
        rightArmRef.current.rotation.set(0.04 - breathSway, -0.06, 1.45 - breathLift * 0.5, "XYZ");
      }
    }

    // Forearms hanging straight down near thighs with relaxed elbows
    if (leftForearmRef.current) {
      if (isVrmSkeleton) {
        leftForearmRef.current.rotation.set(0.08, 0, 0.12, "XYZ");
      } else {
        leftForearmRef.current.rotation.set(0.08, 0, -0.12, "XYZ");
      }
    }
    if (rightForearmRef.current) {
      if (isVrmSkeleton) {
        rightForearmRef.current.rotation.set(0.08, 0, -0.12, "XYZ");
      } else {
        rightForearmRef.current.rotation.set(0.08, 0, 0.12, "XYZ");
      }
    }

    // Hands resting naturally near thighs facing inward
    if (leftHandRef.current) {
      leftHandRef.current.rotation.set(0.03, 0.04, -0.04, "XYZ");
    }
    if (rightHandRef.current) {
      rightHandRef.current.rotation.set(0.03, -0.04, 0.04, "XYZ");
    }

    // 1. Eye Tracking & Blinking
    eyeTrackingRef.current.update(elapsedTime, delta, avatarState);
    eyeTrackingRef.current.applyToBonesAndMorphs(eyeBonesRef.current, morphMeshesRef.current);

    // 2. Lip Sync Visemes on 3D Model Native Morph Targets & Jaw Bone
    const visemeMetrics = lipSyncRef.current.update(delta);

    if (hasMorphTargets || jawBoneRef.current) {
      lipSyncRef.current.applyToMorphMeshes(morphMeshesRef.current, jawBoneRef.current);
    }

    // 3. Expressions
    if (hasMorphTargets) {
      expressionRef.current.update(delta);
      expressionRef.current.applyToMorphMeshes(morphMeshesRef.current);
    }

    // 4. Head & Neck Posture Kinematics
    headMovementRef.current.update(
      elapsedTime,
      delta,
      avatarState,
      visemeMetrics.open,
      cursorTarget
    );
    headMovementRef.current.applyToBonesOrModel(
      headBoneRef.current,
      neckBoneRef.current,
      headBoneRef.current ? null : gltfModel
    );
  });

  return null;
});

export default AnimationManager;
