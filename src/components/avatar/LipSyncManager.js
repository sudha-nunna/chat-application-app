/**
 * LipSyncManager.js
 * Audio-driven viseme lip synchronization with smooth blendshape interpolation.
 * Supports shapes: A, E, I, O, U, M (M/B/P), F (F/V), L, Rest.
 */

// Phoneme-to-Viseme shape metrics definitions
export const VISEME_PRESETS = {
  rest: { open: 0.0, width: 1.0, funnel: 0.0, pucker: 0.0, jawRot: 0.0, press: 0.0, rpmViseme: "viseme_sil" },
  A:    { open: 0.85, width: 1.1, funnel: 0.2, pucker: 0.0, jawRot: 0.22, press: 0.0, rpmViseme: "viseme_aa" },
  E:    { open: 0.45, width: 1.35, funnel: 0.0, pucker: 0.0, jawRot: 0.12, press: 0.0, rpmViseme: "viseme_E" },
  I:    { open: 0.35, width: 1.4, funnel: 0.0, pucker: 0.0, jawRot: 0.1, press: 0.0, rpmViseme: "viseme_I" },
  O:    { open: 0.8, width: 0.75, funnel: 0.85, pucker: 0.4, jawRot: 0.24, press: 0.0, rpmViseme: "viseme_O" },
  U:    { open: 0.55, width: 0.6, funnel: 0.9, pucker: 0.8, jawRot: 0.16, press: 0.0, rpmViseme: "viseme_U" },
  M:    { open: 0.02, width: 0.95, funnel: 0.0, pucker: 0.0, jawRot: 0.01, press: 0.8, rpmViseme: "viseme_PP" }, // M / B / P
  F:    { open: 0.2, width: 1.05, funnel: 0.1, pucker: 0.0, jawRot: 0.06, press: 0.4, rpmViseme: "viseme_FF" }, // F / V
  L:    { open: 0.6, width: 1.1, funnel: 0.1, pucker: 0.0, jawRot: 0.17, press: 0.0, rpmViseme: "viseme_DD" },  // L / N
  S:    { open: 0.3, width: 1.2, funnel: 0.0, pucker: 0.0, jawRot: 0.08, press: 0.0, rpmViseme: "viseme_SS" }
};

export class LipSyncManager {
  constructor() {
    this.currentShape = "rest";
    this.targetMetrics = { ...VISEME_PRESETS.rest };
    this.currentMetrics = { ...VISEME_PRESETS.rest };
    this.lerpFactor = 0.24; // Smooth interpolation speed to eliminate mouth snapping
  }

  setViseme(shape) {
    const key = VISEME_PRESETS[shape] ? shape : "rest";
    this.currentShape = key;
    this.targetMetrics = { ...VISEME_PRESETS[key] };
  }

  update(deltaTime = 0.016) {
    // Frame-rate independent smooth dampening
    const factor = Math.min(1.0, this.lerpFactor * (deltaTime * 60));

    this.currentMetrics.open += (this.targetMetrics.open - this.currentMetrics.open) * factor;
    this.currentMetrics.width += (this.targetMetrics.width - this.currentMetrics.width) * factor;
    this.currentMetrics.funnel += (this.targetMetrics.funnel - this.currentMetrics.funnel) * factor;
    this.currentMetrics.pucker += (this.targetMetrics.pucker - this.currentMetrics.pucker) * factor;
    this.currentMetrics.jawRot += (this.targetMetrics.jawRot - this.currentMetrics.jawRot) * factor;
    this.currentMetrics.press += (this.targetMetrics.press - this.currentMetrics.press) * factor;

    return this.currentMetrics;
  }

  applyToMorphMeshes(morphMeshes, jawBone) {
    const m = this.currentMetrics;

    // Apply jaw bone rotation if skeleton jaw bone exists
    if (jawBone) {
      jawBone.rotation.x = m.jawRot * 1.2;
    }

    if (!morphMeshes || morphMeshes.length === 0) return;

    morphMeshes.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;
      if (!dict || !inf) return;

      // 1. Primary Jaw Open mapping
      const jawOpenIdx = dict["jawOpen"] ?? dict["mouthOpen"] ?? dict["Mouth_Open"] ?? dict["mouth_open"] ?? dict["viseme_aa"];
      if (jawOpenIdx !== undefined) inf[jawOpenIdx] = m.open;

      // 2. Smile / Width mapping
      const mouthSmileIdx = dict["mouthSmile"] ?? dict["mouthSmileLeft"] ?? dict["viseme_E"];
      if (mouthSmileIdx !== undefined) inf[mouthSmileIdx] = m.currentShape === "E" || m.currentShape === "I" ? 0.75 : 0.1;

      // 3. Funnel mapping
      const mouthFunnelIdx = dict["mouthFunnel"] ?? dict["viseme_O"];
      if (mouthFunnelIdx !== undefined) inf[mouthFunnelIdx] = m.funnel;

      // 4. Pucker mapping
      const mouthPuckerIdx = dict["mouthPucker"] ?? dict["viseme_U"];
      if (mouthPuckerIdx !== undefined) inf[mouthPuckerIdx] = m.pucker;

      // 5. Lip Press (M/B/P) mapping
      const mouthPressIdx = dict["mouthPressLeft"] ?? dict["mouthClose"] ?? dict["viseme_PP"];
      if (mouthPressIdx !== undefined) inf[mouthPressIdx] = m.press;

      // 6. Direct RPM & VRM Visemes mapping
      Object.keys(VISEME_PRESETS).forEach((vKey) => {
        const rpmKey = VISEME_PRESETS[vKey].rpmViseme;
        if (dict[rpmKey] !== undefined) {
          const isCurrent = this.currentShape === vKey;
          inf[dict[rpmKey]] += ((isCurrent ? 0.9 : 0.0) - inf[dict[rpmKey]]) * 0.25;
        }
      });

      // 7. VRM standard visemes (Fcl_MTH_A, Head_A, preset_a, A, I, U, E, O)
      const vrmAIdx = dict["Fcl_MTH_A"] ?? dict["preset_a"] ?? dict["A"] ?? dict["Head_A"] ?? dict["Fcl_MTH_A (baked)"];
      const vrmIIdx = dict["Fcl_MTH_I"] ?? dict["preset_i"] ?? dict["I"] ?? dict["Head_I"] ?? dict["Fcl_MTH_I (baked)"];
      const vrmUIdx = dict["Fcl_MTH_U"] ?? dict["preset_u"] ?? dict["U"] ?? dict["Head_U"] ?? dict["Fcl_MTH_U (baked)"];
      const vrmEIdx = dict["Fcl_MTH_E"] ?? dict["preset_e"] ?? dict["E"] ?? dict["Head_E"] ?? dict["Fcl_MTH_E (baked)"];
      const vrmOIdx = dict["Fcl_MTH_O"] ?? dict["preset_o"] ?? dict["O"] ?? dict["Head_O"] ?? dict["Fcl_MTH_O (baked)"];

      const shape = this.currentShape;
      if (vrmAIdx !== undefined) inf[vrmAIdx] += ((shape === "A" ? m.open * 0.95 : 0.0) - inf[vrmAIdx]) * 0.25;
      if (vrmIIdx !== undefined) inf[vrmIIdx] += ((shape === "I" || shape === "E" ? 0.85 : 0.0) - inf[vrmIIdx]) * 0.25;
      if (vrmUIdx !== undefined) inf[vrmUIdx] += ((shape === "U" ? 0.85 : 0.0) - inf[vrmUIdx]) * 0.25;
      if (vrmEIdx !== undefined) inf[vrmEIdx] += ((shape === "E" ? 0.85 : 0.0) - inf[vrmEIdx]) * 0.25;
      if (vrmOIdx !== undefined) inf[vrmOIdx] += ((shape === "O" ? 0.90 : 0.0) - inf[vrmOIdx]) * 0.25;
    });
  }
}

export default LipSyncManager;
