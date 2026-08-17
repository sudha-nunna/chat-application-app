import React, { useState } from "react";
import { FiUpload, FiUser, FiCheckCircle, FiPlay, FiVolume2, FiZap, FiSliders, FiMessageSquare } from "react-icons/fi";
import { NobackEndCallObj } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import VisemeAvatarPlayer from "../global/VisemeAvatarPlayer";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";

const PRESET_3D_MODELS = [
  { id: "viverse-vrm", name: "Enterprise Viverse VRM AI Agent", presetKey: "/models/viverse_avatar_model_210287.vrm" }
];

const BotAvatarTab = ({ bot, onBotUpdated }) => {
  const { isDark } = useTheme();
  const [botType, setBotType] = useState(bot?.botType || "HYBRID");
  const [responseMode, setResponseMode] = useState(bot?.responseMode || "HYBRID");
  const [avatarProvider, setAvatarProvider] = useState(bot?.avatarProvider || "THREE_3D");
  const [avatarImage, setAvatarImage] = useState(bot?.avatarImage || bot?.avatarConfig?.faceImageUrl || "");
  const [avatarVideo, setAvatarVideo] = useState(bot?.avatarVideo || bot?.avatarConfig?.faceVideoUrl || "");
  const [avatar3DModel, setAvatar3DModel] = useState(bot?.avatar3DModel || bot?.avatarConfig?.faceModelUrl || "/models/viverse_avatar_model_210287.vrm");
  const [selected3DPresetId, setSelected3DPresetId] = useState(bot?.avatar3DModel ? (PRESET_3D_MODELS.find(p => p.presetKey === bot.avatar3DModel)?.id || "custom") : "viverse-vrm");
  const [voiceId, setVoiceId] = useState(bot?.voiceProfile?.voiceId || bot?.voiceConfig?.voiceId || "default-en");
  const [botSpecificRules, setBotSpecificRules] = useState(bot?.botSpecificRules || "");
  const [avatarConfig, setAvatarConfig] = useState(bot?.avatarConfig || {});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewSpeechData, setPreviewSpeechData] = useState(null);
  const [testText, setTestText] = useState("Hello! I am your AI assistant avatar.");

  // Sync state whenever bot prop changes or re-fetches
  React.useEffect(() => {
    if (bot) {
      setBotType(bot.botType || "HYBRID");
      setResponseMode(bot.responseMode || "HYBRID");
      setAvatarProvider(bot.avatarProvider || "THREE_3D");
      setAvatarImage(bot.avatarImage || bot.avatarConfig?.faceImageUrl || "");
      setAvatarVideo(bot.avatarVideo || bot.avatarConfig?.faceVideoUrl || "");
      const currentModel = bot.avatar3DModel || bot.avatarConfig?.faceModelUrl || "/models/viverse_avatar_model_210287.vrm";
      setAvatar3DModel(currentModel);
      setSelected3DPresetId(PRESET_3D_MODELS.find(p => p.presetKey === currentModel)?.id || "custom");
      setVoiceId(bot.voiceProfile?.voiceId || bot.voiceConfig?.voiceId || "default-en");
      setBotSpecificRules(bot.botSpecificRules || "");
      setAvatarConfig(bot.avatarConfig || {});
    }
  }, [bot]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const res = await NobackEndCallObj(`/bots/${bot._id}/avatar`, { fileData: base64Data }, "post");
          if (res?.avatarConfig || res?.avatarImage || res?.avatar3DModel) {
            const newConfig = res.avatarConfig || {};
            setAvatarConfig(newConfig);
            if (res.avatarImage || newConfig.faceImageUrl) {
              setAvatarImage(res.avatarImage || newConfig.faceImageUrl);
            }
            if (res.avatarVideo || newConfig.faceVideoUrl) {
              setAvatarVideo(res.avatarVideo || newConfig.faceVideoUrl);
            }
            if (res.avatar3DModel || newConfig.faceModelUrl) {
              setAvatar3DModel(res.avatar3DModel || newConfig.faceModelUrl);
              setAvatarProvider("THREE_3D");
            }
            if (res.bot) {
              setBotType(res.bot.botType || "AVATAR");
              if (onBotUpdated) onBotUpdated(res.bot);
            }
            setSuccessMsg("Avatar uploaded and processed successfully!");
          }
        } catch (err) {
          console.error("Avatar upload failed:", err);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Avatar reader failed:", err);
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await NobackEndCallObj(`/bots/${bot._id}`, {
        botType,
        responseMode,
        avatarProvider,
        avatarImage,
        avatarVideo,
        avatar3DModel,
        voiceProfile: { voiceId, voiceType: "PRESET" },
        botSpecificRules,
        avatarConfig: {
          ...avatarConfig,
          avatarProvider,
          faceImageUrl: avatarImage,
          faceVideoUrl: avatarVideo,
          faceModelUrl: avatar3DModel,
          avatar3DModel
        }
      }, "put");

      if (res) {
        if (onBotUpdated) onBotUpdated(res);
        setSuccessMsg("Bot mode & avatar settings saved successfully!");
      }
    } catch (err) {
      console.error("Save settings failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTestPreview = async () => {
    if (!testText.trim()) return;
    setGeneratingPreview(true);

    try {
      const res = await NobackEndCallObj(`/bots/${bot._id}/chat`, {
        message: testText,
        includeSpeech: true
      }, "post");

      if (res?.speechData) {
        setPreviewSpeechData(res.speechData);
      } else {
        // Local synthesis fallback preview
        setPreviewSpeechData({
          text: testText,
          audioUrl: "",
          durationMs: testText.length * 80,
          visemes: [
            { timeMs: 0, durationMs: 150, viseme: "ah", shape: "A" },
            { timeMs: 150, durationMs: 180, viseme: "ee", shape: "E" },
            { timeMs: 330, durationMs: 200, viseme: "oh", shape: "O" },
            { timeMs: 530, durationMs: 150, viseme: "mm", shape: "M" }
          ]
        });
      }
    } catch (e) {
      console.warn("Preview generation warning:", e);
    } finally {
      setGeneratingPreview(false);
    }
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-6">
      {/* Success Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <FiCheckCircle className="text-base shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Bot Response Delivery Mode Card */}
      <div className={`p-5 rounded-2xl border shadow-sm space-y-3 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-2 text-sm font-bold text-blue-500">
          <FiSliders className="text-base" />
          <h3>Response Delivery Mode</h3>
        </div>
        <p className="text-xs text-slate-400">
          Intelligence (RAG Knowledge, System Rules & API Actions) is shared across all modes. Choose how this bot presents its output:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "TEXT_ONLY", label: "💬 Text Only", desc: "Markdown text responses" },
            { id: "AUDIO_ONLY", label: "🎙️ Voice Audio", desc: "Text + Speech audio playback" },
            { id: "VIDEO_AVATAR", label: "🎭 Video Avatar", desc: "Text + Voice + Lip-synced Talking Avatar" },
            { id: "HYBRID", label: "🌐 Hybrid (All Modes)", desc: "Text, Voice, Avatar & Interactive Cards" }
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setResponseMode(mode.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${responseMode === mode.id
                  ? "bg-blue-600/15 border-blue-500 text-blue-400 font-semibold ring-2 ring-blue-500/20"
                  : isDark
                    ? "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
            >
              <div className="text-xs font-bold">{mode.label}</div>
              <div className="text-[10px] opacity-75 mt-1 leading-tight">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* DYNAMIC CONFIGURATION PANEL BASED ON SELECTED RESPONSE DELIVERY MODE */}

      {/* 1. TEXT ONLY MODE CONFIGURATION */}
      {responseMode === "TEXT_ONLY" && (
        <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
              <FiMessageSquare className="text-base" />
              <h3>Text-Only Engine Configuration</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              TEXT_ONLY MODE
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
            💬 <strong>Text-Only Mode Active</strong>: Assistant responses will be delivered cleanly as Markdown text. 3D visual avatars and TTS speech audio are disabled to minimize latency and bandwidth.
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-300">Bot Persona & Markdown System Rules</label>
            <textarea
              rows={5}
              value={botSpecificRules}
              onChange={(e) => setBotSpecificRules(e.target.value)}
              placeholder="e.g. Respond concisely using bullet points, use markdown table formatting for data, speak professionally..."
              className={`w-full p-3 rounded-xl border text-xs outline-none transition font-mono ${isDark ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500" : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500"}`}
            />
          </div>
        </div>
      )}

      {/* 2. VOICE AUDIO MODE CONFIGURATION (VOICE CLONING & SPEECH ENGINE) */}
      {responseMode === "AUDIO_ONLY" && (
        <div className={`p-5 rounded-2xl border shadow-sm space-y-5 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-400">
              <FiVolume2 className="text-base" />
              <h3>Voice Audio & Neural Voice Cloning Engine</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              AUDIO_ONLY MODE
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
            🎙️ <strong>Voice Audio Mode Active</strong>: Responses will be spoken aloud using neural text-to-speech audio synthesis. Choose a preset voice profile or upload a voice sample for custom cloning.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Select Neural Voice Profile</label>
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"}`}
                >
                  <option value="default-en">Female Professional (Sophia / Natural)</option>
                  <option value="male-executive">Male Executive (Alex / Deep)</option>
                  <option value="female-warm">Female Casual (Emily / Warm)</option>
                  <option value="male-narrator">Male Narrator (Michael / Expressive)</option>
                  <option value="custom-clone">✨ Custom AI Voice Clone Sample</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Custom Voice Cloning (.mp3 / .wav Upload)</label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-xl cursor-pointer bg-purple-500/5 hover:bg-purple-500/10 transition text-center group">
                  <FiUpload className="text-xl text-purple-400 group-hover:scale-110 transition-transform mb-1" />
                  <span className="text-xs font-bold text-purple-300">Upload 10–30s Voice Sample</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Neural engine extracts vocal timber for custom voice cloning</span>
                  <input type="file" accept="audio/*" className="hidden" />
                </label>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-300">Bot Voice Rules</label>
                <textarea
                  rows={3}
                  value={botSpecificRules}
                  onChange={(e) => setBotSpecificRules(e.target.value)}
                  placeholder="e.g. Speak warmly, answer concisely, use clear speech pauses..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"}`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-300">Test Speech Audio Synthesis</label>
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Enter text to synthesize speech..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                />
                <button
                  type="button"
                  onClick={handleGenerateTestPreview}
                  disabled={generatingPreview}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  <FiPlay className="text-xs" />
                  <span>{generatingPreview ? "Synthesizing Speech..." : "Play Voice Speech Test"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. VIDEO AVATAR & HYBRID MODE CONFIGURATION (3D DIGITAL HUMAN STUDIO) */}
      {(responseMode === "VIDEO_AVATAR" || responseMode === "HYBRID") && (
        <div className={`p-5 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          {/* Left Column: Upload & 3D Character Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-400">
                <FiUser className="text-base" />
                <h3>3D Digital Human & Avatar Studio</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {responseMode} MODE
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure 3D VRM digital humans, 2D portrait photo visemes, or custom avatar model files. The AI renders real-time lip-synced talking avatar responses.
            </p>

            {/* Avatar Provider Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Avatar Engine Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "THREE_3D", label: "🎭 3D Model Canvas" },
                  { id: "LOCAL_VISEME", label: "🖼️ 2D Photo Visemes" },
                  { id: "VIDEO_AVATAR", label: "📹 Video Avatar" }
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      setAvatarProvider(prov.id);
                      if (prov.id === "THREE_3D" && !avatar3DModel) {
                        setAvatar3DModel("/models/viverse_avatar_model_210287.vrm");
                      }
                    }}
                    className={`p-2 rounded-xl border text-center text-xs font-semibold transition ${avatarProvider === prov.id
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 ring-1 ring-blue-500/30"
                        : isDark
                          ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {prov.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Model Character Presets */}
            {avatarProvider === "THREE_3D" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-300">Select Realistic 3D Character Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_3D_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelected3DPresetId(m.id);
                        setAvatar3DModel(m.presetKey);
                        setAvatarProvider("THREE_3D");
                      }}
                      className={`p-2 rounded-xl border text-left text-xs font-semibold transition ${selected3DPresetId === m.id
                          ? "bg-blue-600/20 border-blue-500 text-blue-400 ring-1 ring-blue-500/30 font-bold"
                          : isDark
                            ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      <div className="truncate">{m.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all text-center group">
              <FiUpload className="text-xl text-slate-400 group-hover:text-blue-400 mb-1.5 transition-transform group-hover:scale-110" />
              <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400">
                {uploading ? "Processing Avatar Upload..." : "Click to Upload Photo, Video, or 3D Model (.vrm, .glb, .png, .mp4)"}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Supports VRoid, Ready Player Me & GLTF 3D avatars</span>
              <input type="file" accept="image/*,video/*,.glb,.gltf,.vrm" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>

            {/* Bot Specific Rules Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300">Bot-Specific Override Rules</label>
              <textarea
                rows={3}
                value={botSpecificRules}
                onChange={(e) => setBotSpecificRules(e.target.value)}
                placeholder="e.g. Speak energetically, keep voice pitch warm, handle sales objections concisely..."
                className={`w-full p-3 rounded-xl border text-xs outline-none transition ${isDark ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500" : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500"}`}
              />
            </div>
          </div>

          {/* Right Column: Interactive Live Preview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <FiZap className="text-base" />
              <h3>Live Talking Avatar Preview</h3>
            </div>

            <VisemeAvatarPlayer
              avatarConfig={{
                ...avatarConfig,
                avatarProvider,
                faceImageUrl: avatarImage || avatarConfig?.faceImageUrl,
                faceVideoUrl: avatarVideo || avatarConfig?.faceVideoUrl,
                faceModelUrl: avatar3DModel || avatarConfig?.faceModelUrl,
                avatar3DModel: avatar3DModel || avatarConfig?.avatar3DModel,
                avatarImage,
                avatarVideo
              }}
              speechData={previewSpeechData}
              isAutoPlay={true}
            />

            <div className="space-y-2 pt-2">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text for live avatar test..."
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"}`}
              />
              <button
                type="button"
                onClick={handleGenerateTestPreview}
                disabled={generatingPreview}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <FiPlay className="text-xs" />
                <span>{generatingPreview ? "Synthesizing Speech..." : "Test Avatar Speech"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button Footer */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving Avatar Settings..." : "Save Bot & Avatar Configuration"}
        </button>
      </div>
    </div>
  );
};

export default BotAvatarTab;
