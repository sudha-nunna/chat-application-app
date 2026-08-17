/**
 * ExpressionManager.js
 * AI response sentiment analysis & facial expression preset morph target blending.
 * Presets: Neutral, Happy, Excited, Thinking, Confident, Helpful, Concerned, Surprised.
 */

export const EXPRESSION_PRESETS = {
  Neutral:   { smile: 0.05, browRaise: 0.0,  browFurrow: 0.0,  eyeSquint: 0.0,  surprisedEyes: 0.0 },
  Happy:     { smile: 0.85, browRaise: 0.2,  browFurrow: 0.0,  eyeSquint: 0.3,  surprisedEyes: 0.0 },
  Excited:   { smile: 0.95, browRaise: 0.45, browFurrow: 0.0,  eyeSquint: 0.2,  surprisedEyes: 0.4 },
  Thinking:  { smile: 0.1,  browRaise: 0.1,  browFurrow: 0.4,  eyeSquint: 0.35, surprisedEyes: 0.0 },
  Confident: { smile: 0.4,  browRaise: 0.2,  browFurrow: 0.0,  eyeSquint: 0.2,  surprisedEyes: 0.0 },
  Helpful:   { smile: 0.6,  browRaise: 0.15, browFurrow: 0.0,  eyeSquint: 0.1,  surprisedEyes: 0.0 },
  Concerned: { smile: -0.2, browRaise: 0.3,  browFurrow: 0.6,  eyeSquint: 0.2,  surprisedEyes: 0.0 },
  Surprised: { smile: 0.2,  browRaise: 0.8,  browFurrow: 0.0,  eyeSquint: 0.0,  surprisedEyes: 0.85 }
};

export class ExpressionManager {
  constructor(initialExpression = "Neutral") {
    this.currentExpression = initialExpression;
    this.targetWeights = { ...EXPRESSION_PRESETS.Neutral };
    this.currentWeights = { ...EXPRESSION_PRESETS.Neutral };
    this.lerpSpeed = 0.08;
  }

  setExpression(name) {
    if (!EXPRESSION_PRESETS[name]) return;
    this.currentExpression = name;
    this.targetWeights = { ...EXPRESSION_PRESETS[name] };
  }

  /**
   * Derive expression from AI response text sentiment analysis
   */
  evaluateSentiment(text = "", sentimentHint = null) {
    if (sentimentHint && EXPRESSION_PRESETS[sentimentHint]) {
      this.setExpression(sentimentHint);
      return;
    }

    if (!text || typeof text !== "string") {
      this.setExpression("Neutral");
      return;
    }

    const t = text.toLowerCase();

    if (t.includes("great") || t.includes("awesome") || t.includes("excit") || t.includes("fantastic") || t.includes("amazing")) {
      this.setExpression("Excited");
    } else if (t.includes("happy") || t.includes("welcome") || t.includes("glad") || t.includes("pleasure") || t.includes("smile")) {
      this.setExpression("Happy");
    } else if (t.includes("help") || t.includes("assist") || t.includes("certainly") || t.includes("sure") || t.includes("happy to")) {
      this.setExpression("Helpful");
    } else if (t.includes("confident") || t.includes("definitely") || t.includes("expert") || t.includes("solution")) {
      this.setExpression("Confident");
    } else if (t.includes("sorry") || t.includes("unfortunately") || t.includes("apolog") || t.includes("issue") || t.includes("problem")) {
      this.setExpression("Concerned");
    } else if (t.includes("wow") || t.includes("really?") || t.includes("unexpected") || t.includes("surprise")) {
      this.setExpression("Surprised");
    } else if (t.includes("analyz") || t.includes("calculat") || t.includes("think") || t.includes("consider") || t.includes("hmmm")) {
      this.setExpression("Thinking");
    } else {
      this.setExpression("Neutral");
    }
  }

  update(deltaTime = 0.016) {
    const speed = Math.min(1.0, this.lerpSpeed * (deltaTime * 60));
    Object.keys(this.targetWeights).forEach((key) => {
      this.currentWeights[key] += (this.targetWeights[key] - this.currentWeights[key]) * speed;
    });

    return this.currentWeights;
  }

  applyToMorphMeshes(morphMeshes) {
    if (!morphMeshes || morphMeshes.length === 0) return;
    const w = this.currentWeights;

    morphMeshes.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;
      if (!dict || !inf) return;

      const smileIdx = dict["mouthSmile"] ?? dict["mouthSmileLeft"] ?? dict["MouthSmile"];
      if (smileIdx !== undefined && w.smile > 0) inf[smileIdx] = Math.max(inf[smileIdx] || 0, w.smile);

      const browInnerUpIdx = dict["browInnerUp"] ?? dict["browRaise"] ?? dict["BrowRaise"];
      if (browInnerUpIdx !== undefined) inf[browInnerUpIdx] = w.browRaise;

      const browDownIdx = dict["browDownLeft"] ?? dict["browFurrow"] ?? dict["BrowFurrow"];
      if (browDownIdx !== undefined) inf[browDownIdx] = w.browFurrow;

      const eyeSquintIdx = dict["eyeSquintLeft"] ?? dict["eyeSquint"] ?? dict["EyeSquint"];
      if (eyeSquintIdx !== undefined) inf[eyeSquintIdx] = w.eyeSquint;

      const eyeWideIdx = dict["eyeWideLeft"] ?? dict["surprisedEyes"] ?? dict["EyeWide"];
      if (eyeWideIdx !== undefined) inf[eyeWideIdx] = w.surprisedEyes;
    });
  }
}

export default ExpressionManager;
