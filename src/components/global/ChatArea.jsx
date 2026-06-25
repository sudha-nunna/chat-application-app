import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false); 
  const [streamingReply, setStreamingReply] = useState("");
  const [isAudioActive, setIsAudioActive] = useState(false); // Track if audio is currently playing
  const scrollRef = useRef(null);
  const currentStreamingTextRef = useRef("");

  // Production Audio Management Refs
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

  // Clears and resets all playing audio streams
  const clearAudioPipeline = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    currentSentenceBufferRef.current = "";
    setIsAudioActive(false); // Reset button UI state
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // --- Production Queue Manager ---
  const processAudioQueue = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      // If queue becomes empty naturally, update the audio state
      if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
        setIsAudioActive(false);
      }
      return;
    }

    isPlayingRef.current = true;
    setIsAudioActive(true); // Audio is actively running
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

  // --- Production Sentence Buffering Core Engine ---
  const handleIncomingTextChunk = (textChunk) => {

    const cleanChunk = textChunk.replace(/[\*#_`\-]/g, "");
    
    currentSentenceBufferRef.current += cleanChunk;
    const sentenceEndRegex = /[.!?](\s|$)/;

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
          processAudioQueue();
        }
      }
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

    setMessages((prev) => [...prev, { role: "user", content: textPayload }]);
    setIsSearching(true);
    setIsBotTyping(false);
    setStreamingReply("");
    currentStreamingTextRef.current = "";

    try {
      const token = localStorage.getItem("token");
      const targetChatEndpoint = currentChatId && currentChatId !== "new" ? currentChatId : "new";

      const response = await fetch(
        `http://localhost:5000/api/gemini/message/${targetChatEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: textPayload }),
        }
      );

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
                currentStreamingTextRef.current += textBit;
                setStreamingReply(currentStreamingTextRef.current);
                handleIncomingTextChunk(textBit);
              } else if (parsed.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `⚠️ Error: ${parsed.message}` },
                ]);
                streamFinished = true;
                break;
              }
            } catch (e) {
              // Ignore boundary fractions safely
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
      onChatUpdated();
    } catch (err) {
      console.error("Stream compilation parsing exception error:", err);
      setIsSearching(false);
      setIsBotTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between h-full relative text-slate-100 bg-[#0f172a]">
      {/* Top Header Section */}
      <div className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-[#0f172a]/80 backdrop-blur">
        <span className="font-semibold tracking-wide text-slate-200">
          Gemini Live Terminal Engine
        </span>

        {/*  NEW TOOGLE BUTTON: Stop Audio Player */}
        {isAudioActive && (
          <button
            onClick={clearAudioPipeline}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
            title="Stop AI Voice Output"
          >
            {/* Pulsing Sound Icon */}
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
//   const [isBotTyping, setIsBotTyping] = useState(false); // Keeps a placeholder visible during chunk delays
//   const [streamingReply, setStreamingReply] = useState("");
//   const scrollRef = useRef(null);
//   const currentStreamingTextRef = useRef("");

//   //AUDIO REF
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

//   // AUDIO CLEANUP 
//   const clearAudioPipeline = () => {
//     audioQueueRef.current = [];
//     isPlayingRef.current = false;
//     currentSentenceBufferRef.current = "";
//     if (window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//     }
//   };

//   //  AUDIO QUEUE WORKER 
//   const processAudioQueue = () => {
//     // If an utterance is already playing, or the queue is empty, do nothing
//     if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

//     isPlayingRef.current = true;
//     const nextSentence = audioQueueRef.current.shift();

//     if ("speechSynthesis" in window) {
//       const utterance = new SpeechSynthesisUtterance(nextSentence);
//       utterance.lang = "en-US";
      
//       // When this sentence finishes speaking, move onto the next item in the queue
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
//     }
//   };

//   // SENTENCE SPLITTER ENGINE 
//   const handleIncomingTextChunk = (textChunk) => {
//     currentSentenceBufferRef.current += textChunk;

//     // RegEx checking for sentence boundaries (. or ! or ?) followed by whitespace or string end
//     const sentenceEndRegex = /[.!?](\s|$)/;

//     if (sentenceEndRegex.test(currentSentenceBufferRef.current)) {
//       // Pinpoint the last valid punctuation mark location
//       const lastPunctuationIndex = Math.max(
//         currentSentenceBufferRef.current.lastIndexOf("."),
//         currentSentenceBufferRef.current.lastIndexOf("?"),
//         currentSentenceBufferRef.current.lastIndexOf("!")
//       );

//       if (lastPunctuationIndex !== -1) {
//         // Cut out the completed sentence fragment
//         const completedSentence = currentSentenceBufferRef.current.slice(0, lastPunctuationIndex + 1).trim();
//         // Leave any uncompleted phrase fragments inside the buffer for the next chunk
//         currentSentenceBufferRef.current = currentSentenceBufferRef.current.slice(lastPunctuationIndex + 1);

//         if (completedSentence) {
//           audioQueueRef.current.push(completedSentence);
//           processAudioQueue(); // Run worker to stream the audio output
//         }
//       }
//     }
//   };

//   const loadSavedMessages = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch(
//         `http://localhost:5000/api/chats/${currentChatId}/messages`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         },
//       );
//       const data = await res.json();
//       setMessages(data || []);
//     } catch (err) {
//       console.error("Error reading history collections:", err);
//     }
//   };

//   const handleSendSubmit = async (textPayload) => {
//     if (!textPayload.trim()) return;

//     // Interrupt any active speaking streams immediately if user fires off a new prompt
//     clearAudioPipeline();

//     // 1. Immediately render user text and turn on initial loading state
//     setMessages((prev) => [...prev, { role: "user", content: textPayload }]);
//     setIsSearching(true);
//     setIsBotTyping(false);
//     setStreamingReply("");
//     currentStreamingTextRef.current = "";

//     try {
//       const token = localStorage.getItem("token");
//       const targetChatEndpoint =
//         currentChatId && currentChatId !== "new" ? currentChatId : "new";

//       const response = await fetch(
//         `http://localhost:5000/api/gemini/message/${targetChatEndpoint}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({ message: textPayload }),
//         },
//       );

//       if (!response.body) throw new Error("Readable stream tracking failure.");

//       const reader = response.body.getReader();
//       const decoder = new TextDecoder("utf-8");
//       let streamFinished = false;
//       let buffer = "";

//       // 2. Clear initial search bar and immediately lock in bot typing block state
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

//                 // FEED THE CHUNK DATA TO THE BUFFER MIDDLEWARE IN REAL-TIME
//                 handleIncomingTextChunk(textBit);
//               } else if (parsed.type === "error") {
//                 // 1. Render the clean error text explicitly into the chat block timeline
//                 setMessages((prev) => [
//                   ...prev,
//                   { role: "assistant", content: `⚠️ Error: ${parsed.message}` },
//                 ]);
//                 streamFinished = true;
//                 break;
//               }
//             } catch (e) {
//               // Ignore boundary fractions safely
//             }
//           }
//         }
//       }

//       // Flush any lingering phrases left inside the buffer container once stream cuts off
//       if (currentSentenceBufferRef.current.trim()) {
//         audioQueueRef.current.push(currentSentenceBufferRef.current.trim());
//         processAudioQueue();
//       }

//       // 3. Save final text block to UI collection arrays permanently
//       const finalResponseContent = currentStreamingTextRef.current;
//       if (finalResponseContent) {
//         setMessages((prev) => [
//           ...prev,
//           { role: "assistant", content: finalResponseContent },
//         ]);
//       }

//       // Reset variables smoothly
//       setStreamingReply("");
//       currentStreamingTextRef.current = "";
//       setIsBotTyping(false);
//       onChatUpdated();
//     } catch (err) {
//       console.error("Stream compilation parsing exception error:", err);
//       setIsSearching(false);
//       setIsBotTyping(false);
//     }
//   };

//   return (
//     <div className="flex-1 flex flex-col justify-between h-full relative text-slate-100 bg-[#0f172a]">
//       <div className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-[#0f172a]/80 backdrop-blur">
//         <span className="font-semibold tracking-wide text-slate-200">
//           Gemini Live Terminal Engine
//         </span>
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
//         {messages.length === 0 && !isSearching && !isBotTyping && (
//           <div className="h-full flex items-center justify-center text-slate-500 font-medium text-sm">
//             Enter a prompt statement workspace sequence string underneath to
//             activate live streams tracking.
//           </div>
//         )}

//         {messages.map((m, index) => (
//           <MessageBubble key={index} role={m.role} content={m.content} />
//         ))}

//         {/* Phase 1: Server is thinking / routing / querying DB pipelines */}
//         {isSearching && (
//           <div className="flex justify-start">
//             <div className="bg-[#444654] p-4 rounded-xl text-slate-300 italic flex items-center gap-2 animate-pulse text-sm shadow-md">
//               Searching data pipelines...
//             </div>
//           </div>
//         )}

//         {/* Phase 2: Stream connection active */}
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



