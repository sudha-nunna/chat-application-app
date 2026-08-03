import { useState, useEffect } from "react";
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
  FiLayers
} from "react-icons/fi";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const BotApiTab = ({ bot }) => {
  const [activeSegment, setActiveSegment] = useState("postman"); // "postman" | "manual"
  const [apis, setApis] = useState([]);
  const [postmanApis, setPostmanApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPostmanModalOpen, setIsPostmanModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState(null); // API object being edited
  const { isDark } = useTheme();

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
  const [importing, setImporting] = useState(false);

  // Test Modal State
  const [testResult, setTestResult] = useState(null);
  const [testingApiId, setTestingApiId] = useState(null);

  useEffect(() => {
    fetchApis();
    fetchPostmanApis();
  }, [bot._id]);

  const fetchApis = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bots/${bot._id}/apis`);
      setApis(res.data || []);
    } catch (err) {
      console.error("Failed to load bot APIs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostmanApis = async () => {
    try {
      const res = await api.get(`/bots/${bot._id}/postman-apis`);
      if (res.data && res.data.apis) {
        setPostmanApis(res.data.apis);
      }
    } catch (err) {
      console.error("Failed to load Postman APIs:", err);
    }
  };

  const handleCreateOrUpdateApi = async (e) => {
    e.preventDefault();
    if (!name || !url) return;

    try {
      if (editingApi) {
        if (editingApi.isPostman) {
          await api.put(`/bots/${bot._id}/postman-apis/${editingApi._id}`, {
            name,
            url,
            method
          });
          fetchPostmanApis();
        } else {
          await api.put(`/bots/${bot._id}/apis/${editingApi._id}`, {
            name,
            url,
            method,
            authType,
            apiKey: apiKeyVal
          });
          fetchApis();
        }
      } else {
        await api.post(`/bots/${bot._id}/apis`, {
          name,
          url,
          method,
          authType,
          apiKey: apiKeyVal
        });
        fetchApis();
      }

      closeModal();
    } catch (err) {
      console.error("Failed to save API integration:", err);
    }
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

  const handleDeleteApi = async (apiId) => {
    if (!window.confirm("Delete this API integration?")) return;
    try {
      await api.delete(`/bots/${bot._id}/apis/${apiId}`);
      fetchApis();
    } catch (err) {
      console.error("Failed to delete API integration:", err);
    }
  };

  const handleDeletePostmanApi = async (apiId) => {
    if (!window.confirm("Delete this Postman API endpoint from database?")) return;
    try {
      await api.delete(`/bots/${bot._id}/postman-apis/${apiId}`);
      fetchPostmanApis();
    } catch (err) {
      console.error("Failed to delete Postman API:", err);
    }
  };

  const handleTestApi = async (apiId) => {
    setTestingApiId(apiId);
    setTestResult(null);

    try {
      const res = await api.post(`/bots/${bot._id}/apis/${apiId}/test`);
      setTestResult(res.data);
    } catch (err) {
      setTestResult({
        ok: false,
        error: err.response?.data?.error || err.message
      });
    } finally {
      setTestingApiId(null);
    }
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

  const handleImportPostmanCollection = async (e) => {
    e.preventDefault();
    if (!postmanJsonText || !parsedPreview?.valid) return;

    try {
      setImporting(true);
      const res = await api.post(`/bots/${bot._id}/postman-import`, {
        collectionJson: postmanJsonText
      });

      if (res.data?.success) {
        setIsPostmanModalOpen(false);
        setPostmanJsonText("");
        setParsedPreview(null);
        setPostmanFileName("");
        fetchPostmanApis();
        setActiveSegment("postman");
      }
    } catch (err) {
      console.error("Failed to import Postman collection:", err);
      alert(err.response?.data?.message || "Failed to import Postman collection.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-6 space-y-6 custom-scrollbar ${
      isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            <FiCode className="text-indigo-500" />
            <span>API Integrations Management</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Configure REST APIs manually or parse and import Postman Collections stored in DB for {bot.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPostmanModalOpen(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <FiUploadCloud className="text-sm" />
            <span>Upload Postman Collection</span>
          </button>

          <button
            onClick={() => {
              setEditingApi(null);
              setName("");
              setUrl("");
              setMethod("GET");
              setAuthType("none");
              setApiKeyVal("");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            <FiPlus />
            <span>Add API Manually</span>
          </button>
        </div>
      </div>

      {/* TWO OPTION SEGMENT TABS */}
      <div className={`flex border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
        <button
          onClick={() => setActiveSegment("postman")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeSegment === "postman"
              ? "border-amber-500 text-amber-500"
              : isDark ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FiDatabase />
          <span>Option 1: Upload Postman Collection ({postmanApis.length} Stored in DB)</span>
        </button>

        <button
          onClick={() => setActiveSegment("manual")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeSegment === "manual"
              ? "border-blue-500 text-blue-500"
              : isDark ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FiLayers />
          <span>Option 2: Add Manually APIs ({apis.length})</span>
        </button>
      </div>

      {/* OPTION 1: MANUAL APIS TAB CONTENT */}
      {activeSegment === "manual" && (
        <div className="space-y-3">
          {loading ? (
            <div className={`text-xs text-center py-12 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Loading API Integrations...</div>
          ) : apis.length === 0 ? (
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center ${
              isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-300 bg-white"
            }`}>
              <FiCode className={`text-3xl mx-auto mb-2 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
              <h4 className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-800"}`}>No Manual API Integrations Configured</h4>
              <p className={`text-xs mt-1 mb-4 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                Add custom REST APIs manually to connect Webhooks or CRM endpoints.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <FiPlus />
                <span>Add API Manually</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {apis.map((a) => (
                <div
                  key={a._id}
                  className={`p-4 border rounded-xl flex items-center justify-between gap-4 ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
                      {a.method}
                    </span>
                    <div className="truncate">
                      <h4 className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{a.name}</h4>
                      <p className={`text-[11px] truncate font-mono mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>{a.url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestApi(a._id)}
                      disabled={testingApiId === a._id}
                      className="flex items-center gap-1.5 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      <FiPlay />
                      <span>{testingApiId === a._id ? "Testing..." : "Test API"}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(a, false)}
                      className={`p-2 transition cursor-pointer ${isDark ? "text-slate-400 hover:text-blue-400" : "text-slate-500 hover:text-blue-600"}`}
                      title="Edit API"
                    >
                      <FiEdit />
                    </button>

                    <button
                      onClick={() => handleDeleteApi(a._id)}
                      className={`p-2 transition cursor-pointer ${isDark ? "text-slate-400 hover:text-rose-400" : "text-slate-500 hover:text-rose-600"}`}
                      title="Delete API"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OPTION 2: POSTMAN COLLECTION APIS TAB CONTENT */}
      {activeSegment === "postman" && (
        <div className="space-y-3">
          {postmanApis.length === 0 ? (
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center ${
              isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-300 bg-white"
            }`}>
              <FiUploadCloud className={`text-3xl mx-auto mb-2 text-amber-500`} />
              <h4 className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-800"}`}>No Postman Collection APIs Uploaded</h4>
              <p className={`text-xs mt-1 mb-4 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                Upload a Postman Collection (.json file or JSON text) to automatically parse and store all endpoints in the database.
              </p>
              <button
                onClick={() => setIsPostmanModalOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <FiUploadCloud />
                <span>Upload Postman Collection</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {postmanApis.map((pApi) => (
                <div
                  key={pApi._id}
                  className={`p-3.5 border rounded-xl flex items-start justify-between gap-3 ${
                    isDark ? "bg-slate-950 border-amber-500/30" : "bg-white border-amber-200 shadow-sm"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        pApi.method === "GET" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                        pApi.method === "POST" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        pApi.method === "DELETE" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                        "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {pApi.method}
                      </span>
                      <span className={`text-[11px] font-bold truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                        {pApi.name}
                      </span>
                    </div>

                    <p className={`text-[10px] font-mono truncate ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {pApi.url}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                      <span className="bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">Collection: {pApi.collectionName}</span>
                      {pApi.queryParams && pApi.queryParams.length > 0 && (
                        <span className="text-blue-400">{pApi.queryParams.length} query param(s)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(pApi, true)}
                      className={`p-1.5 transition cursor-pointer ${isDark ? "text-slate-400 hover:text-blue-400" : "text-slate-500 hover:text-blue-600"}`}
                      title="Edit Postman API"
                    >
                      <FiEdit className="text-xs" />
                    </button>

                    <button
                      onClick={() => handleDeletePostmanApi(pApi._id)}
                      className={`p-1.5 transition cursor-pointer ${isDark ? "text-slate-400 hover:text-rose-400" : "text-slate-500 hover:text-rose-600"}`}
                      title="Delete Postman API from DB"
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEST RESULT MODAL OVERLAY */}
      {testResult && (
        <div className={`p-4 border rounded-xl space-y-2 ${
          isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200 shadow-md"
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <h4 className="text-xs font-bold flex items-center gap-2">
              {testResult.ok ? (
                <span className="text-emerald-500 flex items-center gap-1"><FiCheckCircle /> Success ({testResult.status})</span>
              ) : (
                <span className="text-rose-500 flex items-center gap-1"><FiXCircle /> Execution Result</span>
              )}
            </h4>
            <button onClick={() => setTestResult(null)} className={`text-xs ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}>
              Close
            </button>
          </div>
          <pre className={`text-[11px] font-mono p-3 rounded-lg overflow-x-auto max-h-48 custom-scrollbar ${
            isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-800"
          }`}>
            {JSON.stringify(testResult.data || testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* POSTMAN COLLECTION IMPORT MODAL */}
      {isPostmanModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 ${
          isDark ? "bg-black/75" : "bg-slate-900/40"
        }`}>
          <div className={`border rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-500">
                <FiUploadCloud />
                <span>Upload Postman Collection (v2.0 / v2.1)</span>
              </h3>
              <button onClick={() => setIsPostmanModalOpen(false)} className={isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleImportPostmanCollection} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Upload Postman Collection File (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handlePostmanFileChange}
                  className={`w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                />
                {postmanFileName && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <FiFileText /> Loaded: {postmanFileName}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  OR Paste Postman JSON Content
                </label>
                <textarea
                  rows={5}
                  placeholder={`Paste your Postman Collection JSON schema here...`}
                  value={postmanJsonText}
                  onChange={handlePostmanTextChange}
                  className={`w-full border rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {/* LIVE PARSED PREVIEW LIST */}
              {parsedPreview && (
                <div className={`p-3.5 border rounded-xl text-xs space-y-2 ${
                  parsedPreview.valid
                    ? isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-900"
                    : isDark ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-rose-50 border-rose-300 text-rose-900"
                }`}>
                  {parsedPreview.valid ? (
                    <>
                      <div className="flex items-center justify-between font-bold">
                        <span>Collection: {parsedPreview.collectionName}</span>
                        <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[10px]">{parsedPreview.count} Endpoint(s) Found</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {parsedPreview.endpoints.map((ep, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <span className="font-mono font-bold text-[10px] text-amber-400">{ep.method}</span>
                            <span className="font-semibold">{ep.name}:</span>
                            <span className="font-mono text-[10px] opacity-80 truncate">{ep.url}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="font-medium text-rose-400">⚠️ {parsedPreview.error}</p>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsPostmanModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!parsedPreview?.valid || importing}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <FiDatabase />
                  <span>{importing ? "Importing & Storing in DB..." : "Import & Save to DB"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OR EDIT SINGLE API MODAL */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 ${
          isDark ? "bg-black/75" : "bg-slate-900/40"
        }`}>
          <div className={`border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FiCode className="text-blue-500" />
                <span>{editingApi ? "Edit API Integration" : "Add Single API Integration"}</span>
              </h3>
              <button onClick={closeModal} className={isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateApi} className="space-y-3">
              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>API Name</label>
                <input
                  type="text"
                  placeholder="e.g. CRM Contact Service"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>HTTP Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>API URL</label>
                <input
                  type="text"
                  placeholder="https://api.codegene.io/v1/contacts"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {!editingApi?.isPostman && (
                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Auth Type</label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="none">No Auth</option>
                    <option value="apiKey">API Key (x-api-key)</option>
                    <option value="bearerToken">Bearer Token</option>
                  </select>
                </div>
              )}

              {!editingApi?.isPostman && authType !== "none" && (
                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Encrypted Secret Token</label>
                  <input
                    type="password"
                    placeholder="API Secret Key / Token Value"
                    value={apiKeyVal}
                    onChange={(e) => setApiKeyVal(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                    isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20"
                >
                  {editingApi ? "Save Changes" : "Save Integration"}
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
