import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiCheckCircle, FiMessageSquare, FiX } from "react-icons/fi";
import {
  NobackEndCall,
  NobackEndCallObj
} from "../services/authService";
import {
  useTanStackData,
  useTanStackQueryClient
} from "../hooks/useTanStackData";

// Studio Components
import FlowHeader from "../components/studio/FlowHeader";
import NodePalette from "../components/studio/NodePalette";
import FlowCanvas from "../components/studio/FlowCanvas";
import TestDrawer from "../components/studio/TestDrawer";
import SelectVoiceModal from "../components/studio/SelectVoiceModal";
import ConductorModal from "../components/studio/ConductorModal";
import { STUDIO_VOICES } from "../components/studio/studioConstants";

const DEFAULT_FLOW_NODES = [
  {
    id: "begin",
    type: "begin",
    title: "Begin",
    x: 200,
    y: 280
  },
  {
    id: "welcome-node",
    type: "conversation",
    title: "Welcome Greeting",
    badge: "Start",
    color: "pink",
    x: 310,
    y: 260,
    data: {
      text: "Hello! How can I assist you with your inquiry today?",
      transitions: [
        { id: "t1", label: "= Finish conversation", target: "end-node" }
      ]
    }
  },
  {
    id: "end-node",
    type: "ending",
    title: "Ending",
    color: "mint",
    x: 640,
    y: 280,
    data: {}
  }
];

const DEFAULT_CONNECTIONS = [
  { id: "c1", fromNode: "begin", toNode: "welcome-node" },
  { id: "c2", fromNode: "welcome-node", toNode: "end-node", transitionIndex: 0 }
];

export default function AgentStudioPage() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const queryClient = useTanStackQueryClient();
  const isEditMode = Boolean(botId && botId !== "new");
  const loadedBotIdRef = useRef(null);

  // Agent State
  const [name, setName] = useState("Conversation Flow Agent");
  const [environment, setEnvironment] = useState("Development");
  const [lastSavedTime, setLastSavedTime] = useState("20:10");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveNotification, setSaveNotification] = useState(null);

  // Settings State (Configured in Info tab matching Image 1)
  const [language, setLanguage] = useState("English (US)");
  const [voiceProfile, setVoiceProfile] = useState(STUDIO_VOICES[0]); // Cimo
  const [selectedModel, setSelectedModel] = useState("glm-5.3-flash:cloud");
  const [knowledgeSources, setKnowledgeSources] = useState([]);
  const [globalPrompt, setGlobalPrompt] = useState(
    `You are a specialized Knowledge Base AI Assistant.\nYour single source of truth is the provided PDF document knowledge.\n\nSTRICT OPERATIONAL RULES:\n1. ONLY answer questions using facts directly mentioned in the retrieved context chunks.\n2. If the user's question cannot be answered using the provided knowledge, you MUST politely refuse by stating:\n"I can only answer questions based on the provided PDF knowledge document."`
  );

  // Canvas & Flow State
  const [nodes, setNodes] = useState(DEFAULT_FLOW_NODES);
  const [connections, setConnections] = useState(DEFAULT_CONNECTIONS);
  const [selectedNodeId, setSelectedNodeId] = useState("welcome-node");

  // Layout Panels
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(true); // Open directly on right side

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isConductorModalOpen, setIsConductorModalOpen] = useState(false);

  // TanStack Query: Fetch Existing Agent
  const { data: existingBot } = useTanStackData(
    ["agent", botId],
    async () => {
      try {
        const res = await NobackEndCall(`/agents/${botId}`);
        if (res && res.success !== false && !res.error) {
          return res?.data || res;
        }
      } catch (_err) {
        console.debug("Falling back to legacy bot endpoint:", _err?.message);
      }
      const fallbackRes = await NobackEndCall(`/bots/${botId}`);
      if (!fallbackRes || fallbackRes.success === false || fallbackRes.error) return null;
      return fallbackRes?.data || fallbackRes;
    },
    { enabled: isEditMode, retry: 0, staleTime: 30000 }
  );

  // Synchronize state when backend data arrives
  useEffect(() => {
    if (existingBot && loadedBotIdRef.current !== existingBot._id) {
      loadedBotIdRef.current = existingBot._id;
      const timeoutId = setTimeout(() => {
        if (existingBot.name) setName(existingBot.name);
        if (existingBot.systemPrompt) setGlobalPrompt(existingBot.systemPrompt);
        if (existingBot.model) setSelectedModel(existingBot.model);
        if (existingBot.knowledgeSources?.length) {
          setKnowledgeSources(existingBot.knowledgeSources);
        }
        if (existingBot.voiceProfile?.voiceId) {
          const foundVoice = STUDIO_VOICES.find((v) => v.id === existingBot.voiceProfile.voiceId);
          if (foundVoice) setVoiceProfile(foundVoice);
        }
        if (existingBot.flowGraph?.nodes?.length) {
          setNodes(existingBot.flowGraph.nodes);
        }
        if (existingBot.flowGraph?.connections?.length) {
          setConnections(existingBot.flowGraph.connections);
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [existingBot]);

  // Handle selecting a node
  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
  };

  // Handle updating node data
  const handleUpdateNodeData = (nodeId, updatedFields) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          ...(updatedFields.title ? { title: updatedFields.title } : {}),
          data: {
            ...(node.data || {}),
            ...updatedFields
          }
        };
      })
    );
  };

  // Handle deleting a node
  const handleDeleteNode = (nodeId) => {
    if (nodeId === "begin" || nodeId === "welcome-node") return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // Handle adding transition branch
  const handleAddTransition = (nodeId) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) return node;
        const currentTransitions = node.data?.transitions || [];
        const newTransition = {
          id: `t_${Date.now()}`,
          label: `= Condition ${currentTransitions.length + 1}`
        };
        return {
          ...node,
          data: {
            ...(node.data || {}),
            transitions: [...currentTransitions, newTransition]
          }
        };
      })
    );
  };

  // Handle adding new node from palette
  const handleAddNode = (nodeType) => {
    const newId = `${nodeType}-${Date.now()}`;
    const colorMap = {
      conversation: "pink",
      subagent: "green",
      function: "purple",
      logic_split: "blue",
      extract_variable: "slate",
      ending: "mint"
    };

    const newNode = {
      id: newId,
      type: nodeType,
      title: nodeType
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      color: colorMap[nodeType] || "pink",
      x: 420 + Math.floor(Math.random() * 80),
      y: 240 + Math.floor(Math.random() * 80),
      data: {
        text: nodeType === "conversation" ? "Type @ to add dynamic variables..." : undefined,
        transitions: []
      }
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  // Helper to build payload
  const buildAgentPayload = (isPublishedStatus, env) => ({
    name,
    systemPrompt: globalPrompt,
    model: selectedModel,
    botType: "VOICE",
    environment: env || environment || "Development",
    status: isPublishedStatus ? "ACTIVE" : "INACTIVE",
    isPublished: Boolean(isPublishedStatus),
    voiceProfile: {
      voiceId: voiceProfile.id || voiceProfile.voiceId || "cimo",
      name: voiceProfile.name || "Cimo",
      speed: 1.0,
      pitch: 1.0
    },
    knowledgeSources,
    flowGraph: {
      nodes,
      connections
    }
  });

  // Ensure agent exists in database before file upload
  const ensureSavedAgentId = async () => {
    if (botId && botId !== "new") return botId;
    const payload = buildAgentPayload(false, environment);
    const created = await NobackEndCallObj("/agents", payload, "POST");
    const newBotId = created?.data?._id || created?._id;
    if (newBotId) {
      navigate(`/agents/${newBotId}`, { replace: true });
      return newBotId;
    }
    return null;
  };

  // Handle Save Agent Draft
  const handleSave = async () => {
    setIsSaving(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    try {
      const payload = buildAgentPayload(false, environment);

      if (isEditMode) {
        await NobackEndCallObj(`/agents/${botId}`, "PUT", payload);
      } else {
        const created = await NobackEndCallObj("/agents", "POST", payload);
        if (created?.data?._id || created?._id) {
          const newBotId = created?.data?._id || created?._id;
          navigate(`/agents/${newBotId}`, { replace: true });
        }
      }

      setLastSavedTime(timeStr);
      setSaveNotification({ type: "save", message: "Draft setup saved successfully!" });
      setTimeout(() => setSaveNotification(null), 3500);

      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent", botId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      queryClient.invalidateQueries({ queryKey: ["bot", botId] });
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Publish Agent Live
  const handlePublish = async () => {
    setIsPublishing(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    try {
      const payload = buildAgentPayload(true, "Production");

      if (isEditMode) {
        await NobackEndCallObj(`/agents/${botId}`, "PUT", payload);
      } else {
        const created = await NobackEndCallObj("/agents", "POST", payload);
        if (created?.data?._id || created?._id) {
          const newBotId = created?.data?._id || created?._id;
          navigate(`/agents/${newBotId}`, { replace: true });
        }
      }

      setLastSavedTime(timeStr);
      setEnvironment("Production");
      setSaveNotification({
        type: "publish",
        message: "Agent published successfully! Your agent is live and ready for chat."
      });
      setTimeout(() => setSaveNotification(null), 5000);

      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent", botId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      queryClient.invalidateQueries({ queryKey: ["bot", botId] });
    } catch (err) {
      console.error("Publish error:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle AI Conductor applied flow
  const handleApplyConductorFlow = (generatedNodes) => {
    setNodes(generatedNodes);
    setConnections([
      { id: "c1", fromNode: "welcome-node", toNode: "function-node", transitionIndex: 0 },
      { id: "c2", fromNode: "welcome-node", toNode: "subagent-node", transitionIndex: 1 },
      { id: "c3", fromNode: "function-node", toNode: "extract-node", transitionIndex: 0 },
      { id: "c4", fromNode: "extract-node", toNode: "end-node", transitionIndex: 0 },
      { id: "c5", fromNode: "subagent-node", toNode: "end-node", transitionIndex: 0 }
    ]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-surface-primary text-text-primary overflow-hidden select-none relative">
      {/* 1. TOP HEADER BAR */}
      <FlowHeader
        agentName={name}
        onNameChange={setName}
        environment={environment}
        onEnvironmentChange={setEnvironment}
        lastSavedTime={lastSavedTime}
        onOpenConductor={() => setIsConductorModalOpen(true)}
        onSave={handleSave}
        isSaving={isSaving}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />

      {/* Save / Publish Toast Notification */}
      {saveNotification && (
        <div className="absolute top-16 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-primary dark:bg-surface-secondary border border-border-primary shadow-xl animate-fadeIn">
          <FiCheckCircle className="text-emerald-500 text-base shrink-0" />
          <div className="text-xs font-medium text-text-primary">
            {saveNotification.message}
          </div>
          {saveNotification.type === "publish" && !isTestDrawerOpen && (
            <button
              type="button"
              onClick={() => setIsTestDrawerOpen(true)}
              className="ml-2 px-2.5 py-1 rounded-lg text-xs font-bold bg-accent-primary text-white hover:opacity-90 transition cursor-pointer"
            >
              Test Chat
            </button>
          )}
          <button
            type="button"
            onClick={() => setSaveNotification(null)}
            className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
          >
            <FiX className="text-xs" />
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Collapsible Node Palette (Nodes | Info & Config) */}
        <NodePalette
          isCollapsed={isPaletteCollapsed}
          onToggleCollapse={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
          onAddNode={handleAddNode}
          agentId={botId}
          language={language}
          onLanguageChange={setLanguage}
          voiceProfile={voiceProfile}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          globalPrompt={globalPrompt}
          onGlobalPromptChange={setGlobalPrompt}
          knowledgeSources={knowledgeSources}
          onKnowledgeSourcesChange={setKnowledgeSources}
          onEnsureSavedAgentId={ensureSavedAgentId}
        />

        {/* Center: Infinite Flow Canvas */}
        <FlowCanvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onUpdateNodeData={handleUpdateNodeData}
          onDeleteNode={handleDeleteNode}
          onAddTransition={handleAddTransition}
          onNodesChange={setNodes}
        />

        {/* Right: Direct Test Panel (Test Audio | Test LLM | Variables) */}
        <TestDrawer
          isOpen={isTestDrawerOpen}
          onClose={() => setIsTestDrawerOpen(false)}
          agentId={botId}
          agentName={name}
          nodes={nodes}
          voiceProfile={voiceProfile}
          globalPrompt={globalPrompt}
          model={selectedModel}
        />
      </div>

      {/* 3. MODALS */}
      <SelectVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoiceId={voiceProfile.id}
        onSelectVoice={setVoiceProfile}
      />

      <ConductorModal
        isOpen={isConductorModalOpen}
        onClose={() => setIsConductorModalOpen(false)}
        onApplyFlow={handleApplyConductorFlow}
      />

      {/* Floating Test Chat trigger when test panel is closed */}
      {!isTestDrawerOpen && (
        <button
          type="button"
          onClick={() => setIsTestDrawerOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-primary dark:bg-surface-secondary text-text-primary hover:text-accent-primary border border-border-primary shadow-lg hover:shadow-xl transition cursor-pointer group"
          title="Open Test Chat Drawer"
        >
          <FiMessageSquare className="text-sm text-accent-primary group-hover:scale-110 transition-transform" />
          <span>Test Chat</span>
        </button>
      )}
    </div>
  );
}
