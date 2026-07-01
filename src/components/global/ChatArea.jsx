import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false); 
  const [streamingReply, setStreamingReply] = useState("");
  const [isAudioActive, setIsAudioActive] = useState(false); 
  const scrollRef = useRef(null);
  const currentStreamingTextRef = useRef("");

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentSentenceBufferRef = useRef("");

  useEffect(() => {
    if (currentChatId) {
      loadSavedMessages();
    } else {
      setMessages([]);
      setStreamingReply("");
      currentStreamingTextRef.current = "";
      setIsSearching(false);
      setIsBotTyping(false);
      clearAudioPipeline();
    }
  }, [currentChatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingReply, isSearching, isBotTyping]);

  const clearAudioPipeline = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    currentSentenceBufferRef.current = "";
    setIsAudioActive(false); 
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const processAudioQueue = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
        setIsAudioActive(false);
      }
      return;
    }

    isPlayingRef.current = true;
    setIsAudioActive(true); 
    const nextSentence = audioQueueRef.current.shift();

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(nextSentence);
      utterance.lang = "en-US";
      
      utterance.onend = () => {
        isPlayingRef.current = false;
        processAudioQueue(); 
      };

      utterance.onerror = () => {
        isPlayingRef.current = false;
        processAudioQueue();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      isPlayingRef.current = false;
      setIsAudioActive(false);
    }
  };

  const handleIncomingTextChunk = (textChunk) => {
    const cleanChunk = textChunk.replace(/[\*#_`\-]/g, "");
    currentSentenceBufferRef.current += cleanChunk;
    const sentenceEndRegex = /[.!?]/; // FIXED VOICE LAG REGEX HERE

    if (sentenceEndRegex.test(currentSentenceBufferRef.current)) {
      const lastPunctuationIndex = Math.max(
        currentSentenceBufferRef.current.lastIndexOf("."),
        currentSentenceBufferRef.current.lastIndexOf("?"),
        currentSentenceBufferRef.current.lastIndexOf("!")
      );

      if (lastPunctuationIndex !== -1) {
        const completedSentence = currentSentenceBufferRef.current.slice(0, lastPunctuationIndex + 1).trim();
        currentSentenceBufferRef.current = currentSentenceBufferRef.current.slice(lastPunctuationIndex + 1);

        if (completedSentence) {
          audioQueueRef.current.push(completedSentence);
          if (!isPlayingRef.current) {
            processAudioQueue();
          }
        }
      }
    }
  };

  // NEW FUNCTION: Calls your local backend server router (Keeps API key secure on server)
  const executeCRMContactRegistration = async (payload) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/crm/forward-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "✨ **Success!** Your profile details have been synchronized onto the CRM grid console. Our team will contact you shortly." }
        ]);
        if (onChatUpdated) onChatUpdated();
      }
    } catch (error) {
      console.error("Failed to forward contact registration payload:", error);
    }
  };

  const loadSavedMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/chats/${currentChatId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setMessages(data || []);
    } catch (err) {
      console.error("Error reading history collections:", err);
    }
  };

  const handleSendSubmit = async (textPayload) => {
    if (!textPayload.trim()) return;

    clearAudioPipeline(); 

    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setMessages((prev) => [...prev, { role: "user", content: textPayload }]);
    setIsSearching(true);
    setIsBotTyping(false);
    setStreamingReply("");
    currentStreamingTextRef.current = "";

    try {
      const token = localStorage.getItem("token");
      const targetChatEndpoint = currentChatId && currentChatId !== "new" ? currentChatId : "new";
      const conversationMode = "text"; 

      const response = await fetch(
        `http://localhost:5000/api/ollama/message/${targetChatEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            message: textPayload, 
            mode: conversationMode 
          }),
        }
      );

      if (!response.ok) throw new Error(`Server returned error status code: ${response.status}`);
      if (!response.body) throw new Error("Readable stream tracking failure.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamFinished = false;
      let buffer = "";

      setIsSearching(false);
      setIsBotTyping(true);

      while (!streamFinished) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith("data: ")) {
            const dataStr = cleanedLine.replace("data: ", "").trim();

            if (dataStr === "[DONE]") {
              streamFinished = true;
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "meta") {
                if (!currentChatId || currentChatId === "new") {
                  setCurrentChatId(parsed.chatId);
                }
              } else if (parsed.type === "chunk") {
                const textBit = parsed.text || "";
                
                // 1. Append text to your visible live typing bubble
                currentStreamingTextRef.current += textBit;
                setStreamingReply(currentStreamingTextRef.current);
                handleIncomingTextChunk(textBit);

                // 2. DETECT AND INTERCEPT IF THE AI GENERATES THE PLAIN-TEXT TRIGGER
                if (currentStreamingTextRef.current.includes("TRIGGER_START")) {
                  const startIndex = currentStreamingTextRef.current.indexOf("TRIGGER_START");
                  
                  // Process extraction once the closure marker payload streams completely
                  if (currentStreamingTextRef.current.includes("TRIGGER_END")) {
                    const endIndex = currentStreamingTextRef.current.indexOf("TRIGGER_END");
                    
                    const rawPayloadText = currentStreamingTextRef.current.slice(startIndex + "TRIGGER_START".length, endIndex);
                    
                    // Slice the raw text parameters clean from the visible text area stream
                    currentStreamingTextRef.current = currentStreamingTextRef.current.slice(0, startIndex).replace(/will now proceed.*|data:.*$/i, "").trim();
                    setStreamingReply(currentStreamingTextRef.current);
                    
                    const extractField = (fieldName) => {
                      const regex = new RegExp(`${fieldName}:\\s*(.*)`, "i");
                      const match = rawPayloadText.match(regex);
                      return match ? match[1].trim() : "";
                    };
                    
                    const parsedPayload = {
                      firstName: extractField("firstName"),
                      lastName: extractField("lastName"),
                      email: extractField("email"),
                      phone: extractField("phone"),
                      companyName: extractField("companyName"),
                      description: extractField("description")
                    };
                    
                    await executeCRMContactRegistration(parsedPayload);
                    streamFinished = true;
                    break;
                  }
                }
              } else if (parsed.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `⚠️ Error: ${parsed.message}` },
                ]);
                streamFinished = true;
                break;
              }
            } catch (e) {
              // Ignore line fractures
            }
          }
        }
      }

      if (currentSentenceBufferRef.current.trim()) {
        audioQueueRef.current.push(currentSentenceBufferRef.current.trim());
        processAudioQueue();
      }

      const finalResponseContent = currentStreamingTextRef.current;
      if (finalResponseContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: finalResponseContent },
        ]);
      }

      setStreamingReply("");
      currentStreamingTextRef.current = "";
      setIsBotTyping(false);
      if (onChatUpdated) onChatUpdated();
    } catch (err) {
      console.error("Stream compilation parsing exception:", err);
      setIsSearching(false);
      setIsBotTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Error: Unable to process request.` }
      ]);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between h-full relative text-slate-100 bg-[#0f172a]">
      <div className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-[#0f172a]/80 backdrop-blur">
        <span className="font-semibold tracking-wide text-slate-200">
          Gemini Live Terminal Engine
        </span>

        {isAudioActive && (
          <button
            onClick={clearAudioPipeline}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Stop Voice
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.length === 0 && !isSearching && !isBotTyping && (
          <div className="h-full flex items-center justify-center text-slate-500 font-medium text-sm">
            Enter a prompt statement workspace sequence string underneath to activate live streams tracking.
          </div>
        )}

        {messages.map((m, index) => (
          <MessageBubble key={index} role={m.role} content={m.content} />
        ))}

        {isSearching && (
          <div className="flex justify-start">
            <div className="bg-[#444654] p-4 rounded-xl text-slate-300 italic flex items-center gap-2 animate-pulse text-sm shadow-md">
              Searching data pipelines...
            </div>
          </div>
        )}

        {isBotTyping && (
          <MessageBubble
            role="assistant"
            content={streamingReply || "Loading response text..."}
          />
        )}
        <div ref={scrollRef} />
      </div>

      <ChatInput onSend={handleSendSubmit} />
    </div>
  );
};

export default ChatArea;



// import { useState, useEffect, useRef } from "react";
// import MessageBubble from "./MessageBubble";
// import ChatInput from "./ChatInput";

// const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated }) => {
//   const [messages, setMessages] = useState([]);
//   const [isSearching, setIsSearching] = useState(false);
//   const [isBotTyping, setIsBotTyping] = useState(false); 
//   const [streamingReply, setStreamingReply] = useState("");
//   const [isAudioActive, setIsAudioActive] = useState(false); // Track if audio is currently playing
//   const scrollRef = useRef(null);
//   const currentStreamingTextRef = useRef("");

//   // Audio Management Refs
//   const audioQueueRef = useRef([]);
//   const isPlayingRef = useRef(false);
//   const currentSentenceBufferRef = useRef("");

//   useEffect(() => {
//     if (currentChatId) {
//       loadSavedMessages();
//     } else {
//       setMessages([]);
//       setStreamingReply("");
//       currentStreamingTextRef.current = "";
//       setIsSearching(false);
//       setIsBotTyping(false);
//       clearAudioPipeline();
//     }
//   }, [currentChatId]);

//   useEffect(() => {
//     scrollRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages, streamingReply, isSearching, isBotTyping]);

//   // Clears and resets all playing audio streams
//   const clearAudioPipeline = () => {
//     audioQueueRef.current = [];
//     isPlayingRef.current = false;
//     currentSentenceBufferRef.current = "";
//     setIsAudioActive(false); // Reset button UI state
//     if (window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//     }
//   };

//   // Queue Manager 
//   const processAudioQueue = () => {
//     if (isPlayingRef.current || audioQueueRef.current.length === 0) {
//       if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
//         setIsAudioActive(false);
//       }
//       return;
//     }

//     isPlayingRef.current = true;
//     setIsAudioActive(true); // Audio is actively running
//     const nextSentence = audioQueueRef.current.shift();

//     if ("speechSynthesis" in window) {
//       const utterance = new SpeechSynthesisUtterance(nextSentence);
//       utterance.lang = "en-US";
      
//       utterance.onend = () => {
//         isPlayingRef.current = false;
//         processAudioQueue(); 
//       };

//       utterance.onerror = () => {
//         isPlayingRef.current = false;
//         processAudioQueue();
//       };

//       window.speechSynthesis.speak(utterance);
//     } else {
//       isPlayingRef.current = false;
//       setIsAudioActive(false);
//     }
//   };

//   // Sentence Buffering Core Engine 
//   const handleIncomingTextChunk = (textChunk) => {
//     const cleanChunk = textChunk.replace(/[\*#_`\-]/g, "");
//     currentSentenceBufferRef.current += cleanChunk;
//     const sentenceEndRegex = /[.!?]/;

//     if (sentenceEndRegex.test(currentSentenceBufferRef.current)) {
//       const lastPunctuationIndex = Math.max(
//         currentSentenceBufferRef.current.lastIndexOf("."),
//         currentSentenceBufferRef.current.lastIndexOf("?"),
//         currentSentenceBufferRef.current.lastIndexOf("!")
//       );

//       if (lastPunctuationIndex !== -1) {
//         const completedSentence = currentSentenceBufferRef.current.slice(0, lastPunctuationIndex + 1).trim();
//         currentSentenceBufferRef.current = currentSentenceBufferRef.current.slice(lastPunctuationIndex + 1);

//         if (completedSentence) {
//           audioQueueRef.current.push(completedSentence);
//           if (!isPlayingRef.current) {
//             processAudioQueue();
//           }
//         }
//       }
//     }
//   };

//   const loadSavedMessages = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch(
//         `http://localhost:5000/api/chats/${currentChatId}/messages`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       const data = await res.json();
//       setMessages(data || []);
//     } catch (err) {
//       console.error("Error reading history collections:", err);
//     }
//   };

//   const handleSendSubmit = async (textPayload) => {
//     if (!textPayload.trim()) return;

//     clearAudioPipeline(); 

//     // Force wake browser voice management on user event
//     if (window.speechSynthesis && window.speechSynthesis.paused) {
//       window.speechSynthesis.resume();
//     }

//     // Instantly append user message to UI
//     setMessages((prev) => [...prev, { role: "user", content: textPayload }]);
//     setIsSearching(true);
//     setIsBotTyping(false);
//     setStreamingReply("");
//     currentStreamingTextRef.current = "";

//     try {
//       const token = localStorage.getItem("token");
//       const targetChatEndpoint = currentChatId && currentChatId !== "new" ? currentChatId : "new";

//       // Modes: "voice" (returns immediate single JSON), "text" (returns chunks)
//       const conversationMode = "text"; 

//       const response = await fetch(
//         `http://localhost:5000/api/ollama/message/${targetChatEndpoint}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({ 
//             message: textPayload, 
//             mode: conversationMode 
//           }),
//         }
//       );

//       if (!response.ok) {
//         throw new Error(`Server returned error status code: ${response.status}`);
//       }

//       // =========================================================================
//       //  DIRECT RECOVERY HANDLER (NATIVE SINGLE VOICE CHANNEL MATCH)
//       // =========================================================================
//       if (conversationMode === "voice") {
//         const data = await response.json();
//         setIsSearching(false);

//         if (data.success && data.replyText) {
//           // Instantly show the assistant message on the screen
//           setMessages((prev) => [...prev, { role: "assistant", content: data.replyText }]);
//           handleIncomingTextChunk(data.replyText);
          
//           setTimeout(() => {
//             if (currentSentenceBufferRef.current.trim()) {
//               audioQueueRef.current.push(currentSentenceBufferRef.current.trim());
//               processAudioQueue();
//             }
//           }, 50);
//         } else {
//           throw new Error(data.message || "Failed to fetch voice response text payload.");
//         }
//         if (onChatUpdated) onChatUpdated();
//         return; // Prevent execution path from falling downward into the stream parsing engines
//       }
//       if (!response.body) throw new Error("Readable stream tracking failure.");

//       const reader = response.body.getReader();
//       const decoder = new TextDecoder("utf-8");
//       let streamFinished = false;
//       let buffer = "";

//       setIsSearching(false);
//       setIsBotTyping(true);

//       while (!streamFinished) {
//         const { value, done } = await reader.read();
//         if (done) break;

//         buffer += decoder.decode(value, { stream: true });
//         const lines = buffer.split("\n");
//         buffer = lines.pop() || "";

//         for (const line of lines) {
//           const cleanedLine = line.trim();
//           if (cleanedLine.startsWith("data: ")) {
//             const dataStr = cleanedLine.replace("data: ", "").trim();

//             if (dataStr === "[DONE]") {
//               streamFinished = true;
//               break;
//             }

//             try {
//               const parsed = JSON.parse(dataStr);
//               if (parsed.type === "meta") {
//                 if (!currentChatId || currentChatId === "new") {
//                   setCurrentChatId(parsed.chatId);
//                 }
//               } else if (parsed.type === "chunk") {
//                 const textBit = parsed.text || "";
//                 currentStreamingTextRef.current += textBit;
//                 setStreamingReply(currentStreamingTextRef.current);
//                 handleIncomingTextChunk(textBit);
//               } else if (parsed.type === "error") {
//                 setMessages((prev) => [
//                   ...prev,
//                   { role: "assistant", content: `⚠️ Error: ${parsed.message}` },
//                 ]);
//                 streamFinished = true;
//                 break;
//               }
//             } catch (e) {
//               // Ignore partial parsing boundary breaks safely
//             }
//           }
//         }
//       }

//       if (currentSentenceBufferRef.current.trim()) {
//         audioQueueRef.current.push(currentSentenceBufferRef.current.trim());
//         processAudioQueue();
//       }

//       const finalResponseContent = currentStreamingTextRef.current;
//       if (finalResponseContent) {
//         setMessages((prev) => [
//           ...prev,
//           { role: "assistant", content: finalResponseContent },
//         ]);
//       }

//       setStreamingReply("");
//       currentStreamingTextRef.current = "";
//       setIsBotTyping(false);
//       if (onChatUpdated) onChatUpdated();
//     } catch (err) {
//       console.error("Stream compilation parsing exception error handled:", err);
//       setIsSearching(false);
//       setIsBotTyping(false);
      
//       // Render the error directly onto the UI layout so the user sees it instantly
//       setMessages((prev) => [
//         ...prev,
//         { role: "assistant", content: `⚠️ Error: Unable to process request. Please check backend connections.` }
//       ]);
//     }
//   };

//   return (
//     <div className="flex-1 flex flex-col justify-between h-full relative text-slate-100 bg-[#0f172a]">
//       {/* Top Header Section */}
//       <div className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-[#0f172a]/80 backdrop-blur">
//         <span className="font-semibold tracking-wide text-slate-200">
//           Gemini Live Terminal Engine
//         </span>

//         {/* Toggle Button: Stop Audio Player */}
//         {isAudioActive && (
//           <button
//             onClick={clearAudioPipeline}
//             className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
//             title="Stop AI Voice Output"
//           >
//             <span className="relative flex h-2 w-2">
//               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
//               <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
//             </span>
//             Stop Voice
//           </button>
//         )}
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
//         {messages.length === 0 && !isSearching && !isBotTyping && (
//           <div className="h-full flex items-center justify-center text-slate-500 font-medium text-sm">
//             Enter a prompt statement workspace sequence string underneath to activate live streams tracking.
//           </div>
//         )}

//         {messages.map((m, index) => (
//           <MessageBubble key={index} role={m.role} content={m.content} />
//         ))}

//         {isSearching && (
//           <div className="flex justify-start">
//             <div className="bg-[#444654] p-4 rounded-xl text-slate-300 italic flex items-center gap-2 animate-pulse text-sm shadow-md">
//               Searching data pipelines...
//             </div>
//           </div>
//         )}

//         {isBotTyping && (
//           <MessageBubble
//             role="assistant"
//             content={streamingReply || "Loading response text..."}
//           />
//         )}
//         <div ref={scrollRef} />
//       </div>

//       <ChatInput onSend={handleSendSubmit} />
//     </div>
//   );
// };

// export default ChatArea;




