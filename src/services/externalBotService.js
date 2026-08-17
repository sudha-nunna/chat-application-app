const API_ENDPOINT =
  import.meta.env.VITE_EXTERNAL_BOT_API_ENDPOINT ||
  `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/v1/external/bots/chat`;

const BOT_API_KEY =
  import.meta.env.VITE_EXTERNAL_BOT_API_KEY ||
  "bot_pk_e465312abcf8a4dd44d3fe113569be48";

const BOT_SECRET_KEY =
  import.meta.env.VITE_EXTERNAL_BOT_SECRET_KEY ||
  "bot_sk_9d4c62e87acb835c97ee93d871d01f5f82506533fe4a6ab0";

/**
 * Capitalizes every word in a prompt string (Title Case Format)
 * @param {string} str - User prompt string
 * @returns {string} - Capitalized Title Case string
 */
export function toCapitalized(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

/**
 * Formats single line breaks \n to "  \n" to ensure ReactMarkdown renders line breaks
 * @param {string} text - Raw Markdown text
 * @returns {string} - Formatted Markdown text
 */
export function formatMarkdownBreaks(text) {
  if (!text || typeof text !== "string") return text;
  let normalized = text.replace(/^[ \t]*•[ \t]*/gm, "* ");
  return normalized.replace(/([^\n])\n(?![*#\-\d|]|  \n)([^\n])/g, "$1  \n$2");
}

/**
 * Extracts bullet lists or metadata arrays into structured items & intro text
 * @param {string} content - Message content
 * @param {Object} metadata - Message metadata
 * @returns {{ intro: string, items: Array<string>|null }}
 */
export function extractListAndIntro(content, metadata) {
  if (metadata?.list && Array.isArray(metadata.list)) {
    return { intro: content, items: metadata.list };
  }
  if (metadata?.items && Array.isArray(metadata.items)) {
    return { intro: content, items: metadata.items };
  }
  if (metadata?.options && Array.isArray(metadata.options)) {
    return { intro: content, items: metadata.options };
  }

  if (!content || typeof content !== "string") return { intro: content, items: null };

  const lines = content.split("\n");
  const introLines = [];
  const items = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:[-*•]|\d+[\.\)])\s+(.+)$/);
    if (match && match[1]) {
      const itemText = match[1].trim();
      const cleanText = itemText.replace(/^\*\*(.*)\*\*$/, "$1").trim();
      if (cleanText && cleanText.length < 120) {
        items.push(cleanText);
      } else {
        introLines.push(line);
      }
    } else {
      introLines.push(line);
    }
  }

  if (items.length >= 1) {
    return {
      intro: introLines.join("\n").trim(),
      items
    };
  }

  return { intro: content, items: null };
}

/**
 * Detects the response format type of a bot message
 * @param {Object} msg - The message object { content, metadata }
 * @returns {"out_of_the_box" | "table" | "list" | "text"} - The detected response format
 */
export function getResponseFormat(msg) {
  if (!msg) return "text";

  const { content = "", metadata = {} } = msg;
  const type = msg.responseType || msg.type || metadata?.responseType || metadata?.type;

  // 1. OUT OF THE BOX / SCHEDULE CALL FORMAT
  if (
    type === "out_of_the_box" ||
    type === "schedule_call" ||
    type === "card" ||
    metadata?.out_of_the_box ||
    (typeof content === "string" && content.toLowerCase().includes("schedule a discovery call"))
  ) {
    return "out_of_the_box";
  }

  // 2. TABLE FORMAT
  if (
    type === "table" ||
    metadata?.headers ||
    metadata?.table ||
    (typeof content === "string" && content.includes("|---"))
  ) {
    return "table";
  }

  // 3. LIST FORMAT


  if (
    type === "list" ||
    metadata?.list ||
    metadata?.items ||
    (typeof content === "string" && /^(?:[-*•]|\d+[\.\)])\s+/m.test(content))
  ) {
    return "list";
  }

  // 4. DEFAULT TEXT FORMAT
  return "text";
}

/**
 * Advanced SSE Stream Service Method supporting both positional and object options
 */
export async function streamExternalChatApi(promptOrOptions, onChunkCb, onMetadataCb, signalOrDone, conversationIdParam) {
  let message = "";
  let onChunk = onChunkCb;
  let onMetadata = onMetadataCb;
  let onDone = null;
  let signal = null;
  let conversationId = conversationIdParam || null;

  if (typeof promptOrOptions === "object" && promptOrOptions !== null) {
    message = promptOrOptions.message || promptOrOptions.prompt || "";
    onChunk = promptOrOptions.onChunk || onChunkCb;
    onMetadata = promptOrOptions.onMetadata || onMetadataCb;
    onDone = promptOrOptions.onDone;
    signal = promptOrOptions.signal;
    conversationId = promptOrOptions.conversationId || conversationIdParam || null;
  } else {
    message = promptOrOptions || "";
    if (signalOrDone instanceof AbortSignal) {
      signal = signalOrDone;
    } else if (typeof signalOrDone === "function") {
      onDone = signalOrDone;
    }
  }

  const payload = {
    message,
    ...(conversationId ? { conversationId } : {})
  };

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      "X-Bot-Api-Key": BOT_API_KEY,
      "X-Bot-Secret-Key": BOT_SECRET_KEY
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP Error! Status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body stream received.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split(/\n\n/);
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      parseAndDispatchSSEBlock(block, { onChunk, onMetadata, onDone });
    }
  }

  if (buffer.trim()) {
    parseAndDispatchSSEBlock(buffer.trim(), { onChunk, onMetadata, onDone });
  }

  if (onDone) onDone();
}

/**
 * Utility to parse event & data lines inside an SSE block
 */
function parseAndDispatchSSEBlock(block, { onChunk, onMetadata, onDone }) {
  const lines = block.split(/\r?\n/);
  let eventType = "chunk";
  let dataStr = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("event:")) {
      eventType = trimmed.substring(6).trim();
    } else if (trimmed.startsWith("data:")) {
      dataStr = trimmed.substring(5).trim();
    } else if (!dataStr && !trimmed.startsWith("event:")) {
      dataStr = trimmed;
    }
  }

  if (!dataStr) return;

  if (eventType === "done" || dataStr === "[DONE]") {
    if (onDone) onDone();
    return;
  }

  try {
    const parsed = JSON.parse(dataStr);

    // Extract text/token payload across all possible backend field names
    const token =
      parsed.text ??
      parsed.chunk ??
      parsed.content ??
      parsed.message ??
      parsed.reply ??
      parsed.answer ??
      parsed.response ??
      "";

    const metaObj = parsed.metadata || (parsed.responseType || parsed.type || parsed.title || parsed.headers ? parsed : null);

    if (metaObj && onMetadata) {
      onMetadata(metaObj);
    }

    if (token && onChunk) {
      onChunk(token);
    } else if (!token && !metaObj && typeof parsed === "string" && onChunk) {
      onChunk(parsed);
    }
  } catch (e) {
    if (dataStr && dataStr !== "[DONE]" && onChunk) {
      onChunk(dataStr);
    }
  }
}

/**
 * Reads existing Avatar conversationId from sessionStorage for a given botId
 */
export function getAvatarConversationId(botId) {
  if (!botId) return null;
  return sessionStorage.getItem(`avatar_conversation_${botId}`) || null;
}

/**
 * Clears Avatar conversationId from sessionStorage for a given botId
 */
export function clearAvatarConversationSession(botId) {
  if (botId) {
    sessionStorage.removeItem(`avatar_conversation_${botId}`);
  }
}

/**
 * Sends a message to the dedicated Avatar Chat API endpoint
 * POST /api/v1/avatar/chat
 */
export async function sendAvatarChatMessage(botId, conversationIdParam, message, audioBlob = null) {
  const token = localStorage.getItem("token");
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const conversationId =
    conversationIdParam ||
    getAvatarConversationId(botId) ||
    null;

  let reqOptions = {};

  if (audioBlob) {
    const formData = new FormData();
    if (botId) formData.append("botId", botId);
    if (conversationId) formData.append("conversationId", conversationId);
    if (message) formData.append("message", message);

    const mime = audioBlob.type || "audio/wav";
    const ext = mime.includes("webm") ? "webm" : mime.includes("mp4") ? "mp4" : "wav";
    formData.append("audio", audioBlob, `user_voice_${Date.now()}.${ext}`);

    reqOptions = {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : ""
      },
      body: formData
    };
  } else {
    reqOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : ""
      },
      body: JSON.stringify({
        botId,
        conversationId,
        message
      })
    };
  }

  const res = await fetch(`${baseUrl}/bots/avatar/chat`, reqOptions);

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Avatar Chat failed (${res.status})`);
  }

  const data = await res.json();
  if (data?.conversationId) {
    sessionStorage.setItem(`avatar_conversation_${botId}`, data.conversationId);
  }
  return data;
}
