/**
 * HeadMovementManager.js
 * Procedural head & neck kinematics: breathing, state-driven posture, speech nods, attention tilts.
 */

export class HeadMovementManager {
  constructor() {
    this.currentRotation = { x: 0, y: 0, z: 0 };
    this.targetRotation = { x: 0, y: 0, z: 0 };
    this.currentPosition = { x: 0, y: 0, z: 0 };

    this.nodTimer = 0;
    this.isNodding = false;
    this.nodProgress = 0;
    this.nodIntensity = 0.05;
  }

  triggerNod(intensity = 0.06) {
    this.isNodding = true;
    this.nodProgress = 0;
    this.nodIntensity = intensity;
  }

  update(elapsedTime, deltaTime = 0.016, avatarState = "IDLE", visemeOpen = 0, cursorTarget = { x: 0, y: 0 }) {
    // 1. Natural Breathing & Organic Micro Sway Movements
    const breathOffset = Math.sin(elapsedTime * 1.8) * 0.015;
    const microYaw = Math.sin(elapsedTime * 1.2) * 0.06 + Math.cos(elapsedTime * 1.7) * 0.04;
    const microPitch = Math.sin(elapsedTime * 1.4) * 0.04;
    const microRoll = Math.cos(elapsedTime * 0.9) * 0.02;

    let statePitch = 0;
    let stateYaw = 0;
    let stateRoll = 0;
    let stateZ = 0;
    let stateY = breathOffset;

    // 2. State-Specific Posture & Expressive Kinetics
    switch (avatarState) {
      case "LISTENING":
        // Forward attentive posture & mouse cursor gaze tracking
        stateZ = 0.04;
        statePitch = -0.06 + cursorTarget.y * 0.15;
        stateYaw = cursorTarget.x * 0.22;
        stateRoll = 0.04;
        break;

      case "THINKING":
        // Head tilt up & to the side
        statePitch = 0.12;
        stateYaw = 0.14;
        stateRoll = -0.06;
        break;

      case "SPEAKING":
        // Natural speech rhythm head movements: pitch nod + yaw sway
        const speakNod = Math.sin(elapsedTime * 8.0) * (0.06 + visemeOpen * 0.14);
        const speakSway = Math.cos(elapsedTime * 4.5) * 0.08;

        statePitch = speakNod + cursorTarget.y * 0.12;
        stateYaw = speakSway + cursorTarget.x * 0.18;
        stateRoll = Math.sin(elapsedTime * 3.5) * 0.03;

        // Occasional agreement nod while speaking
        if (Math.random() < 0.012 && !this.isNodding) {
          this.triggerNod(0.08);
        }
        break;

      case "IDLE":
      default:
        statePitch = microPitch + cursorTarget.y * 0.10;
        stateYaw = microYaw + cursorTarget.x * 0.15;
        stateRoll = microRoll;
        break;
    }

    // 3. Agreement Nod Animation Overlay
    if (this.isNodding) {
      this.nodProgress += deltaTime * 5.5;
      if (this.nodProgress >= 1.0) {
        this.isNodding = false;
        this.nodProgress = 0;
      } else {
        const nodAngle = Math.sin(this.nodProgress * Math.PI * 2) * this.nodIntensity;
        statePitch += nodAngle;
      }
    }

    // Smooth Kinematic Lerping
    const lerpSpeed = 0.14;
    this.currentRotation.x += (statePitch - this.currentRotation.x) * lerpSpeed;
    this.currentRotation.y += (stateYaw - this.currentRotation.y) * lerpSpeed;
    this.currentRotation.z += (stateRoll - this.currentRotation.z) * lerpSpeed;
    this.currentPosition.z += (stateZ - this.currentPosition.z) * lerpSpeed;
    this.currentPosition.y += (stateY - this.currentPosition.y) * lerpSpeed;

    return {
      rotation: this.currentRotation,
      position: this.currentPosition
    };
  }

  applyToBonesOrModel(headBone, neckBone, modelGroup) {
    const r = this.currentRotation;
    const p = this.currentPosition;

    if (headBone) {
      headBone.rotation.set(r.x, r.y, r.z, "YXZ");
      if (neckBone) {
        neckBone.rotation.set(r.x * 0.4, r.y * 0.4, r.z * 0.3, "YXZ");
      }
    } else if (modelGroup) {
      modelGroup.rotation.set(r.x, r.y, r.z, "YXZ");
      modelGroup.position.z = p.z;
      modelGroup.position.y = p.y;
    }
  }
}

export default HeadMovementManager;
