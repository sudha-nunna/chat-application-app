import React, { useState, useEffect } from 'react';
import { FiDatabase, FiX, FiCheck } from 'react-icons/fi';

const SwitchServerModal = ({ isOpen, onClose, modelsList, selectedModel, onConfirm, userCredits }) => {
  const [activeProvider, setActiveProvider] = useState(null);

  useEffect(() => {
    if (isOpen && selectedModel) {
      const p = getProvider(selectedModel);
      setActiveProvider(p);
    }
  }, [isOpen, selectedModel]);

  if (!isOpen) return null;

  const getProvider = (m) => {
    let p = m.provider || m.serverFormat || "";
    p = p.toLowerCase().trim();
    if (!p || p === "system") {
      const mid = (m.modelId || "").toLowerCase();
      if (mid.includes("gemini")) return "gemini";
      if (mid.includes("gpt")) return "openai";
      if (mid.includes("llama")) return "ollama";
      if (mid.includes("glm")) return "glm";
      if (p) return p;
      return "other";
    }
    return p;
  };

  const getProviderDescription = (p) => {
    if (p === 'gemini') return 'Google Gemini Cloud';
    if (p === 'openai') return 'OpenAI Cloud Network';
    if (p === 'llama' || p === 'ollama' || p === 'vllm') return 'vLLM / High-Speed Node';
    if (p === 'glm') return 'GLM Reasoning API';
    if (p === 'codegene') return 'vLLM / High-Speed Node';
    return 'Active Node';
  };

  const getProviderColor = (p) => {
    if (p === 'gemini' || p === 'gemini2' || p === 'gemini1' || p === 'gemini4') return 'text-[#FFB800]';
    if (p === 'llama' || p === 'llama1' || p === 'codegene') return 'text-[#FFB800]'; // Lightning icon color
    if (p === 'glm' || p === 'openai') return 'text-[#00C853]';
    return 'text-[#FFB800]';
  };

  // Group models by provider
  const groups = {};
  modelsList.forEach(m => {
    if (!m.enabled || m.modelId === 'auto') return;
    const p = getProvider(m);
    if (!groups[p]) {
      groups[p] = {
        name: p,
        description: getProviderDescription(p),
        models: [],
        firstModel: m
      };
    }
    groups[p].models.push(m);
  });

  const providers = Object.values(groups);

  const handleConfirm = () => {
    if (activeProvider && groups[activeProvider] && groups[activeProvider].models.length > 0) {
      // Pick a recommended or first model of this provider
      const providerModels = groups[activeProvider].models;
      const modelToSelect = providerModels.find(m => m.recommended) || providerModels[0];
      onConfirm(modelToSelect);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[600px] bg-[#121212] border border-[#2A2A2A] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2A2A2A] flex justify-between items-center bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FFB800]/10 text-[#FFB800]">
              <FiDatabase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[#E0E0E0] text-[16px] font-bold tracking-wide">Select Active AI Server</h2>
              <p className="text-[#888] text-[12px]">{providers.length} active servers online in cluster</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-[#888] hover:text-[#E0E0E0] hover:bg-[#2A2A2A] transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#888] text-[11px] font-bold uppercase tracking-wider">Choose Active Server</h3>
            <span className="text-[#FFB800] text-[11px] font-bold">{providers.length} available</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {providers.map((group) => {
              const isSelected = activeProvider === group.name;
              
              return (
                <div
                  key={group.name}
                  onClick={() => setActiveProvider(group.name)}
                  className={`
                    p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden
                    ${isSelected 
                      ? 'border-[#FFB800] bg-[#FFB800]/10' 
                      : 'border-[#2A2A2A] hover:border-[#444] bg-[#161616]'
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[16px] ${getProviderColor(group.name)}`}>
                        {group.name.includes('llama') ? '⚡' : group.name.includes('glm') ? '🌐' : '✨'}
                      </span>
                      <h4 className="text-[#E0E0E0] font-bold text-[14px] capitalize">{group.name}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#FFB800] text-[10px] font-bold">{group.models.length} model{group.models.length > 1 ? 's' : ''}</span>
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#FFB800]' : 'bg-[#00C853]'}`}></div>
                    </div>
                  </div>
                  
                  <p className="text-[#888] text-[12px] mb-4">{group.description}</p>
                  
                  <div className="flex items-center gap-2 text-[10px] font-medium">
                    <span className="text-[#888]">Rate:</span>
                    <span className="text-[#FFB800] font-bold">0.05 in • 0.1 out</span>
                  </div>

                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-[#FFB800] rounded-xl pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2A2A2A] bg-[#161616] flex justify-between items-center">
          <div className="text-[12px] font-medium text-[#888]">
            Wallet: <span className="text-[#FFB800] font-bold">{userCredits} cr</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[#E0E0E0] text-[13px] font-semibold hover:bg-[#2A2A2A] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!activeProvider}
              className={`
                px-5 py-2 rounded-lg text-black text-[13px] font-bold flex items-center gap-2 transition-colors
                ${activeProvider 
                  ? 'bg-[#FFB800] hover:bg-[#F2AE00]' 
                  : 'bg-[#FFB800]/50 cursor-not-allowed text-black/50'
                }
              `}
            >
              <FiCheck className="w-4 h-4" />
              Confirm & Start Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwitchServerModal;
