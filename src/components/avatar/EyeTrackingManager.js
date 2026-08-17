/**
 * EyeTrackingManager.js
 * Manages blinking, saccadic micro-movements, smooth cursor gaze tracking, and natural gaze shifts.
 */

export class EyeTrackingManager {
  constructor() {
    this.blinkWeight = 0;
    this.blinkProgress = 0;
    this.isBlinking = false;
    this.nextBlinkTime = 2.0;

    // Mouse / Cursor Target Gaze (-1 to 1)
    this.cursorTarget = { x: 0, y: 0 };
    this.currentGaze = { x: 0, y: 0 };

    // Saccade Micro-movements
    this.saccadeOffset = { x: 0, y: 0 };
    this.saccadeTimer = 0;
    this.nextSaccadeInterval = 1.5;

    // Gaze wander target (prevents frozen staring)
    this.gazeWanderTarget = { x: 0, y: 0 };
    this.gazeWanderTimer = 0;
  }

  setCursorTarget(x, y) {
    this.cursorTarget.x = Math.max(-1, Math.min(1, x));
    this.cursorTarget.y = Math.max(-1, Math.min(1, y));
  }

  update(elapsedTime, deltaTime = 0.016, avatarState = "IDLE") {
    // 1. Blinking Logic (Random blink every 2-6 seconds with double blink probability)
    if (!this.isBlinking && elapsedTime > this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    if (this.isBlinking) {
      this.blinkProgress += deltaTime * 8.5; // ~120ms blink duration
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.blinkWeight = 0;

        // Occasional double blink (15% chance)
        const isDoubleBlink = Math.random() < 0.15;
        const interval = isDoubleBlink ? 0.25 : 2.0 + Math.random() * 4.0;
        this.nextBlinkTime = elapsedTime + interval;
      } else {
        // Smooth sine wave eyelid closure curve
        this.blinkWeight = Math.sin(this.blinkProgress * Math.PI);
      }
    }

    // 2. Saccade Micro-movements (Rapid involuntary eye shifts)
    this.saccadeTimer += deltaTime;
    if (this.saccadeTimer >= this.nextSaccadeInterval) {
      this.saccadeTimer = 0;
      this.nextSaccadeInterval = 0.8 + Math.random() * 2.2;
      this.saccadeOffset = {
        x: (Math.random() - 0.5) * 0.04,
        y: (Math.random() - 0.5) * 0.03
      };
    }

    // 3. Gaze Wander (State-dependent focus shift)
    this.gazeWanderTimer += deltaTime;
    if (this.gazeWanderTimer >= 3.0) {
      this.gazeWanderTimer = 0;
      if (avatarState === "THINKING") {
        // Thinking state: Gaze shifts slightly up and left/right
        this.gazeWanderTarget = {
          x: (Math.random() - 0.5) * 0.35,
          y: 0.25 + Math.random() * 0.15
        };
      } else if (avatarState === "LISTENING") {
        // Listening state: Direct focus on user center
        this.gazeWanderTarget = { x: 0, y: -0.05 };
      } else {
        // Idle / Speaking: Subtle organic wander
        this.gazeWanderTarget = {
          x: (Math.random() - 0.5) * 0.15,
          y: (Math.random() - 0.5) * 0.1
        };
      }
    }

    // Combine cursor target, wander target, and saccades
    const targetX = this.cursorTarget.x * 0.22 + this.gazeWanderTarget.x + this.saccadeOffset.x;
    const targetY = this.cursorTarget.y * 0.18 + this.gazeWanderTarget.y + this.saccadeOffset.y;

    const gazeLerpSpeed = avatarState === "LISTENING" ? 0.15 : 0.08;
    this.currentGaze.x += (targetX - this.currentGaze.x) * gazeLerpSpeed;
    this.currentGaze.y += (targetY - this.currentGaze.y) * gazeLerpSpeed;

    return {
      blinkWeight: this.blinkWeight,
      gazeX: this.currentGaze.x,
      gazeY: this.currentGaze.y
    };
  }

  applyToBonesAndMorphs(eyeBones, morphMeshes) {
    // 1. Morph target eyelid blinking (RPM & VRM support)
    if (morphMeshes && morphMeshes.length > 0) {
      morphMeshes.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const inf = mesh.morphTargetInfluences;
        if (!dict || !inf) return;

        const blinkL = dict["eyeBlinkLeft"] ?? dict["eyesClosed"] ?? dict["blink"] ?? dict["EyeBlinkLeft"] ?? dict["Fcl_EYE_Close"] ?? dict["Fcl_EYE_Close_L"] ?? dict["preset_blink"] ?? dict["Blink"] ?? dict["Head_BlinkL"];
        const blinkR = dict["eyeBlinkRight"] ?? dict["eyesClosed"] ?? dict["blink"] ?? dict["EyeBlinkRight"] ?? dict["Fcl_EYE_Close"] ?? dict["Fcl_EYE_Close_R"] ?? dict["preset_blink"] ?? dict["Blink"] ?? dict["Head_BlinkR"];

        if (blinkL !== undefined) inf[blinkL] = this.blinkWeight;
        if (blinkR !== undefined) inf[blinkR] = this.blinkWeight;
      });
    }

    // 2. Eye bones rotation gaze tracking
    if (eyeBones && eyeBones.length > 0) {
      eyeBones.forEach((bone) => {
        bone.rotation.y = this.currentGaze.x * 0.4;
        bone.rotation.x = -this.currentGaze.y * 0.3;
      });
    }
  }
}

export default EyeTrackingManager;
