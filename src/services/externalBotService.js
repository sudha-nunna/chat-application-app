const API_ENDPOINT = "https://chat-application-service.onrender.com/api/v1/external/bots/chat";
const BOT_API_KEY = "bot_pk_e465312abcf8a4dd44d3fe113569be48";
const BOT_SECRET_KEY = "bot_sk_9d4c62e87acb835c97ee93d871d01f5f82506533fe4a6ab0";

/**
 * Advanced SSE Stream Service Method supporting multi-event streams
 * Handles:
 * - event: chunk -> text streaming ({ text: "..." })
 * - event: metadata -> rich structured metadata ({ responseType: "table", title: "..." })
 * - event: done -> stream completion ([DONE])
 */
export async function streamExternalChatApi({ message, onChunk, onMetadata, onDone, signal }) {
  console.log("🚀 [streamExternalChatApi Initiated] Sending Prompt:", message);

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      "X-Bot-Api-Key": BOT_API_KEY,
      "X-Bot-Secret-Key": BOT_SECRET_KEY
    },
    body: JSON.stringify({ message }),
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

    // Split stream by block double newlines (\n\n) or single newlines (\n)
    const blocks = buffer.split(/\n\n/);
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      parseAndDispatchSSEBlock(block, { onChunk, onMetadata, onDone });
    }
  }

  // Process remaining buffer chunk if present
  if (buffer.trim()) {
    parseAndDispatchSSEBlock(buffer.trim(), { onChunk, onMetadata, onDone });
  }

  if (onDone) onDone();
}

/**
 * Utility to parse event & data lines inside an SSE block
 */
function parseAndDispatchSSEBlock(block, { onChunk, onMetadata, onDone }) {
  console.log("📥 [SSE Raw Block Received]:", block);

  const lines = block.split(/\r?\n/);
  let eventType = "chunk"; // Default SSE event type
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
    console.log("✅ [SSE Stream Finished: DONE]");
    if (onDone) onDone();
    return;
  }

  try {
    const parsed = JSON.parse(dataStr);
    console.log(`📡 [SSE Event: "${eventType}"] Parsed Data:`, parsed);

    // High-Visibility Log for Table Formats / Structured Data
    if (
      parsed.responseType === "table" ||
      eventType === "table" ||
      parsed.table ||
      parsed.headers ||
      parsed.rows
    ) {
      console.log("📊 [TABLE FORMAT RECEIVED]:", {
        responseType: parsed.responseType || eventType,
        title: parsed.title,
        headers: parsed.headers,
        rows: parsed.rows,
        data: parsed.data || parsed
      });
    }

    if (eventType === "metadata" || parsed.responseType || parsed.title || parsed.metadata) {
      const metaObj = parsed.metadata || parsed;
      console.log("🏷️ [Metadata Callback Dispatched]:", metaObj);
      if (onMetadata) onMetadata(metaObj);
    } else if (eventType === "chunk" || parsed.text !== undefined || parsed.chunk !== undefined) {
      const token = parsed.text ?? parsed.chunk ?? parsed.content ?? parsed.message ?? "";
      if (token && onChunk) onChunk(token);
    } else {
      // Fallback for general json objects
      const token = parsed.text ?? parsed.chunk ?? (typeof parsed === "string" ? parsed : "");
      if (token && onChunk) onChunk(token);
      if (parsed.responseType && onMetadata) onMetadata(parsed);
    }
  } catch (e) {
    console.log(`🔤 [SSE Non-JSON Text Chunk]:`, dataStr);
    // Non-JSON raw text fallback
    if (dataStr && dataStr !== "[DONE]" && onChunk) {
      onChunk(dataStr);
    }
  }
}
