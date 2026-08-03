import { useState } from "react";
import {
  FiCode,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiPlay,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiUploadCloud,
  FiFileText,
  FiDatabase,
  FiLayers,
  FiRefreshCw
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj, backEndCallObjDel } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient
} from "../../hooks/useTanStackData";

const BotApiTab = ({ bot }) => {
  const [activeSegment, setActiveSegment] = useState("postman"); // "postman" | "manual"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPostmanModalOpen, setIsPostmanModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState(null); // API object being edited
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  // Form State for Custom Single API
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [authType, setAuthType] = useState("none");
  const [apiKeyVal, setApiKeyVal] = useState("");

  // Postman Import State
  const [postmanJsonText, setPostmanJsonText] = useState("");
  const [postmanFileName, setPostmanFileName] = useState("");
  const [parsedPreview, setParsedPreview] = useState(null);

  // Test Modal State
  const [testResult, setTestResult] = useState(null);
  const [testingApiId, setTestingApiId] = useState(null);

  // 1. GET Route: Custom APIs
  const {
    data: apis = [],
    isLoading: loadingApis,
    refetch: fetchApis
  } = useTanStackData(
    ["bot-apis", bot?._id],
    async () => {
      if (!bot?._id) return [];
      const res = await NobackEndCall(`/bots/${bot._id}/apis`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!bot?._id }
  );

  // 2. GET Route: Postman Collection APIs
  const {
    data: postmanData = null,
    isLoading: loadingPostmanApis,
    refetch: fetchPostmanApis
  } = useTanStackData(
    ["bot-postman-apis", bot?._id],
    async () => {
      if (!bot?._id) return { apis: [] };
      const res = await NobackEndCall(`/bots/${bot._id}/postman-apis`);
      return res?.data || res || { apis: [] };
    },
    { enabled: !!bot?._id }
  );

  const postmanApis = postmanData?.apis || (Array.isArray(postmanData) ? postmanData : []);
  const loading = loadingApis || loadingPostmanApis;

  // Mutations
  const saveApiMutation = useTanStackMutation({
    mutationFn: async ({ isEdit, isPostman, payload, apiId }) => {
      if (isEdit) {
        if (isPostman) {
          return await NobackEndCallObj(`/bots/${bot._id}/postman-apis/${apiId}`, payload, "put");
        } else {
          return await NobackEndCallObj(`/bots/${bot._id}/apis/${apiId}`, payload, "put");
        }
      } else {
        return await NobackEndCallObj(`/bots/${bot._id}/apis`, payload, "post");
      }
    },
    onSuccess: (_, variables) => {
      if (variables.isPostman) {
        queryClient.invalidateQueries({ queryKey: ["bot-postman-apis", bot._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["bot-apis", bot._id] });
      }
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      closeModal();
    },
    onError: (err) => {
      console.error("Failed to save API integration:", err);
    }
  });

  const deleteApiMutation = useTanStackMutation({
    mutationFn: async (apiId) => {
      return await backEndCallObjDel(`/bots/${bot._id}/apis`, apiId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-apis", bot._id] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    }
  });

  const deletePostmanApiMutation = useTanStackMutation({
    mutationFn: async (apiId) => {
      return await backEndCallObjDel(`/bots/${bot._id}/postman-apis`, apiId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-postman-apis", bot._id] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    }
  });

  const importPostmanMutation = useTanStackMutation({
    mutationFn: async (collectionJson) => {
      return await NobackEndCallObj(`/bots/${bot._id}/postman-import`, { collectionJson }, "post");
    },
    onSuccess: (data) => {
      if (data?.success || data?.data?.success) {
        setIsPostmanModalOpen(false);
        setPostmanJsonText("");
        setParsedPreview(null);
        setPostmanFileName("");
        queryClient.invalidateQueries({ queryKey: ["bot-postman-apis", bot._id] });
        queryClient.invalidateQueries({ queryKey: ["bots"] });
        setActiveSegment("postman");
      }
    },
    onError: (err) => {
      console.error("Failed to import Postman collection:", err);
      alert(err?.error || err?.message || "Failed to import Postman collection.");
    }
  });

  const testApiMutation = useTanStackMutation({
    mutationFn: async (apiId) => {
      setTestingApiId(apiId);
      return await NobackEndCallObj(`/bots/${bot._id}/apis/${apiId}/test`, {}, "post");
    },
    onSuccess: (resData) => {
      setTestResult(resData);
      setTestingApiId(null);
    },
    onError: (err) => {
      setTestResult({
        ok: false,
        error: err?.error || err?.message || "Test failed"
      });
      setTestingApiId(null);
    }
  });

  const handleCreateOrUpdateApi = (e) => {
    e.preventDefault();
    if (!name || !url) return;

    const payload = editingApi?.isPostman
      ? { name, url, method }
      : { name, url, method, authType, apiKey: apiKeyVal };

    saveApiMutation.mutate({
      isEdit: !!editingApi,
      isPostman: editingApi?.isPostman || false,
      payload,
      apiId: editingApi?._id
    });
  };

  const openEditModal = (apiItem, isPostman = false) => {
    setEditingApi({ ...apiItem, isPostman });
    setName(apiItem.name || "");
    setUrl(apiItem.url || "");
    setMethod(apiItem.method || "GET");
    setAuthType(apiItem.authType || "none");
    setApiKeyVal("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingApi(null);
    setName("");
    setUrl("");
    setMethod("GET");
    setAuthType("none");
    setApiKeyVal("");
  };

  const handleDeleteApi = (apiId) => {
    if (!window.confirm("Delete this API integration?")) return;
    deleteApiMutation.mutate(apiId);
  };

  const handleDeletePostmanApi = (apiId) => {
    if (!window.confirm("Delete this Postman API endpoint from database?")) return;
    deletePostmanApiMutation.mutate(apiId);
  };

  const handleTestApi = (apiId) => {
    setTestResult(null);
    testApiMutation.mutate(apiId);
  };

  const handlePostmanFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPostmanFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setPostmanJsonText(content);
      parsePreviewJson(content);
    };
    reader.readAsText(file);
  };

  const handlePostmanTextChange = (e) => {
    const val = e.target.value;
    setPostmanJsonText(val);
    parsePreviewJson(val);
  };

  const parsePreviewJson = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      const items = data.item || [];
      const collectionName = data.info?.name || "Postman Collection";

      const endpoints = [];
      const extractRecursive = (list) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
          if (item.item) {
            extractRecursive(item.item);
          } else if (item.request) {
            const req = item.request;
            endpoints.push({
              name: item.name || "Endpoint",
              method: (req.method || "GET").toUpperCase(),
              url: typeof req.url === "string" ? req.url : req.url?.raw || ""
            });
          }
        }
      };
      extractRecursive(items);

      setParsedPreview({
        valid: true,
        collectionName,
        count: endpoints.length,
        endpoints
      });
    } catch (err) {
      setParsedPreview({ valid: false, error: "Invalid JSON format." });
    }
  };

  const handleImportPostmanCollection = (e) => {
    e.preventDefault();
    if (!postmanJsonText || !parsedPreview?.valid) return;
    importPostmanMutation.mutate(postmanJsonText);
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-6 space-y-6 custom-scrollbar ${
      isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            <FiCode className="text-blue-500 text-lg" />
            <span>External API & Tool Integrations</span>
          </h2>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Manage REST APIs and Postman collections available for this agent to execute.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPostmanModalOpen(true)}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md transition"
          >
            <FiUploadCloud className="text-sm" />
            <span>Import Postman</span>
          </button>

          <button
            onClick={() => {
              setEditingApi(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md transition"
          >
            <FiPlus className="text-sm" />
            <span>Add Manual API</span>
          </button>
        </div>
      </div>

      {/* Segment Switcher */}
      <div className={`flex items-center p-1 rounded-xl border w-fit ${
        isDark ? "bg-slate-950/60 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <button
          onClick={() => setActiveSegment("postman")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSegment === "postman"
              ? "bg-indigo-600 text-white shadow-sm"
              : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FiLayers className="text-xs" />
          <span>Postman Collections ({postmanApis.length})</span>
        </button>

        <button
          onClick={() => setActiveSegment("manual")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSegment === "manual"
              ? "bg-indigo-600 text-white shadow-sm"
              : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FiCode className="text-xs" />
          <span>Custom APIs ({apis.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className={`flex items-center justify-center h-48 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          <FiRefreshCw className="animate-spin text-lg text-indigo-500 mr-2" />
          <span>Loading API Integrations...</span>
        </div>
      ) : activeSegment === "postman" ? (
        postmanApis.length === 0 ? (
          <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${isDark ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
            <FiUploadCloud className="text-3xl text-orange-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold mb-1">No Postman APIs Imported</h4>
            <p className={`text-[11px] max-w-xs mx-auto mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Import your Postman Collection JSON file to automatically register all endpoints for this bot.
            </p>
            <button
              onClick={() => setIsPostmanModalOpen(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition"
            >
              Import Postman Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postmanApis.map((apiItem) => (
              <div
                key={apiItem._id}
                className={`p-4 rounded-2xl border flex flex-col justify-between ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        apiItem.method === "GET" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        apiItem.method === "POST" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        apiItem.method === "PUT" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {apiItem.method}
                      </span>
                      <h4 className="text-xs font-bold truncate">{apiItem.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(apiItem, true)}
                        className={`p-1.5 rounded-lg text-xs transition ${
                          isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                        }`}
                        title="Edit Endpoint"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDeletePostmanApi(apiItem._id)}
                        className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition"
                        title="Delete Endpoint"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  <p className={`text-[11px] font-mono truncate p-2 rounded-lg border ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    {apiItem.url}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        apis.length === 0 ? (
          <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${isDark ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
            <FiCode className="text-3xl text-indigo-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold mb-1">No Custom APIs Added</h4>
            <p className={`text-[11px] max-w-xs mx-auto mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Add custom REST API endpoints that this AI Bot can execute automatically during chat.
            </p>
            <button
              onClick={() => {
                setEditingApi(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition"
            >
              Add Custom API
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apis.map((apiItem) => (
              <div
                key={apiItem._id}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        apiItem.method === "GET" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        apiItem.method === "POST" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        apiItem.method === "PUT" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {apiItem.method}
                      </span>
                      <h4 className="text-xs font-bold truncate">{apiItem.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTestApi(apiItem._id)}
                        disabled={testingApiId === apiItem._id}
                        className="p-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 transition"
                        title="Test Execution"
                      >
                        {testingApiId === apiItem._id ? <FiRefreshCw className="animate-spin" /> : <FiPlay />}
                      </button>
                      <button
                        onClick={() => openEditModal(apiItem, false)}
                        className={`p-1.5 rounded-lg text-xs transition ${
                          isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                        }`}
                        title="Edit Endpoint"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteApi(apiItem._id)}
                        className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition"
                        title="Delete Endpoint"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  <p className={`text-[11px] font-mono truncate p-2 rounded-lg border ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    {apiItem.url}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/40 mb-4">
              <h3 className="text-sm font-bold">
                {editingApi ? "Edit API Endpoint" : "Add Custom API Endpoint"}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200">
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateApi} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">API Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Create User Contact"
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/resource"
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {!editingApi?.isPostman && (
                <div>
                  <label className="block font-bold mb-1">Authentication</label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="none">No Auth (Public Endpoint)</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apiKey">API Key Header</option>
                  </select>

                  {authType !== "none" && (
                    <input
                      type="password"
                      value={apiKeyVal}
                      onChange={(e) => setApiKeyVal(e.target.value)}
                      placeholder="Enter Auth Token or Secret Key"
                      className={`w-full mt-2 p-2.5 rounded-xl border text-xs font-mono ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saveApiMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl transition"
                >
                  {saveApiMutation.isPending ? "Saving..." : editingApi ? "Update API" : "Save API"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT POSTMAN MODAL */}
      {isPostmanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FiUploadCloud className="text-orange-500" />
                <span>Import Postman Collection</span>
              </h3>
              <button onClick={() => setIsPostmanModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleImportPostmanCollection} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Collection File (.json)</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handlePostmanFileChange}
                  className={`w-full p-2 rounded-xl border text-xs ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Or Paste Collection JSON Text</label>
                <textarea
                  rows={5}
                  value={postmanJsonText}
                  onChange={handlePostmanTextChange}
                  placeholder="Paste raw Postman Collection v2.1 JSON here..."
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono custom-scrollbar ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              {parsedPreview && (
                <div className={`p-3 rounded-xl border text-xs ${
                  parsedPreview.valid
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                }`}>
                  {parsedPreview.valid ? (
                    <div>
                      <p className="font-bold">Collection: {parsedPreview.collectionName}</p>
                      <p className="text-[11px] mt-0.5">Found {parsedPreview.count} endpoints ready to import.</p>
                    </div>
                  ) : (
                    <p>{parsedPreview.error}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setIsPostmanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={importPostmanMutation.isPending || !parsedPreview?.valid}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl transition"
                >
                  {importPostmanMutation.isPending ? "Importing..." : "Import Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotApiTab;
