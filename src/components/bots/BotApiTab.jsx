import { useState, useEffect } from "react";
import {
  FiCode,
  FiPlus,
  FiTrash2,
  FiPlay,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiLock
} from "react-icons/fi";
import api from "../../services/api";

const BotApiTab = ({ bot }) => {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [authType, setAuthType] = useState("none");
  const [apiKeyVal, setApiKeyVal] = useState("");

  // Test Modal State
  const [testResult, setTestResult] = useState(null);
  const [testingApiId, setTestingApiId] = useState(null);

  useEffect(() => {
    fetchApis();
  }, [bot._id]);

  const fetchApis = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bots/${bot._id}/apis`);
      setApis(res.data);
    } catch (err) {
      console.error("Failed to load bot APIs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApi = async (e) => {
    e.preventDefault();
    if (!name || !url) return;

    try {
      await api.post(`/bots/${bot._id}/apis`, {
        name,
        url,
        method,
        authType,
        apiKey: apiKeyVal
      });

      setName("");
      setUrl("");
      setApiKeyVal("");
      setIsModalOpen(false);
      fetchApis();
    } catch (err) {
      console.error("Failed to create API integration:", err);
    }
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

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <FiCode className="text-indigo-400" />
            <span>Integrated HTTP APIs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure external REST APIs for {bot.name} to query during chat.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition"
        >
          <FiPlus />
          <span>Add Integration</span>
        </button>
      </div>

      {/* APIS LIST */}
      {loading ? (
        <div className="text-xs text-slate-400 text-center py-12">Loading API Integrations...</div>
      ) : apis.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center bg-slate-950/40">
          <FiCode className="text-3xl text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-300">No API Integrations Configured</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Connect external Webhooks, CRM endpoints, or REST services to expand this bot's capabilities.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            <FiPlus />
            <span>Add Integration</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {apis.map((a) => (
            <div
              key={a._id}
              className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 truncate">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {a.method}
                </span>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-200">{a.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">{a.url}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestApi(a._id)}
                  disabled={testingApiId === a._id}
                  className="flex items-center gap-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <FiPlay />
                  <span>{testingApiId === a._id ? "Testing..." : "Test API"}</span>
                </button>

                <button
                  onClick={() => handleDeleteApi(a._id)}
                  className="p-2 text-slate-500 hover:text-rose-400 transition"
                  title="Delete Integration"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEST RESULT MODAL OVERLAY */}
      {testResult && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold flex items-center gap-2">
              {testResult.ok ? (
                <span className="text-emerald-400 flex items-center gap-1"><FiCheckCircle /> Success ({testResult.status})</span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1"><FiXCircle /> Execution Result</span>
              )}
            </h4>
            <button onClick={() => setTestResult(null)} className="text-slate-400 text-xs hover:text-white">
              Close
            </button>
          </div>
          <pre className="text-[11px] font-mono bg-slate-900 p-3 rounded-lg text-slate-300 overflow-x-auto max-h-48 custom-scrollbar">
            {JSON.stringify(testResult.data || testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* CREATE API MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FiCode className="text-blue-400" />
                <span>Add API Integration</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleCreateApi} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">API Name</label>
                <input
                  type="text"
                  placeholder="e.g. CRM Contact Service"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">HTTP Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">API URL</label>
                <input
                  type="text"
                  placeholder="https://api.codegene.io/v1/contacts"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Auth Type</label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="none">No Auth</option>
                  <option value="apiKey">API Key (x-api-key)</option>
                  <option value="bearerToken">Bearer Token</option>
                </select>
              </div>

              {authType !== "none" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Encrypted Secret Token</label>
                  <input
                    type="password"
                    placeholder="API Secret Key / Token Value"
                    value={apiKeyVal}
                    onChange={(e) => setApiKeyVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20"
                >
                  Save Integration
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
