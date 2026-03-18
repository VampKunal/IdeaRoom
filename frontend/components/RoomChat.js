import React, { useState, useEffect, useRef } from "react";
import { getSocket } from "../app/lib/socket";
import { MessageSquare, X, Send } from "lucide-react";

export default function RoomChat({ roomId, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    // Only subscribe to socket events if the chat is actually open, or at least if we opened it once
    if (!socket || !isOpen) return;

    // Load history when opening
    socket.emit("get_chat_history", { roomId });

    const handleChatHistory = (history) => {
      setMessages(history);
    };

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("chat_history", handleChatHistory);
    socket.on("chat_message", handleNewMessage);

    return () => {
      socket.off("chat_history", handleChatHistory);
      socket.off("chat_message", handleNewMessage);
    };
  }, [roomId, isOpen]);

  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isSending]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    setIsSending(true);

    const socket = getSocket();
    if (!socket) {
      setIsSending(false);
      return;
    }

    const isAiRequest = input.trim().toLowerCase().startsWith("@ai");
    let base64Image = null;

    if (isAiRequest) {
      try {
        const board = document.getElementById("whiteboard-container");
        if (board) {
          const html2canvas = (await import("html2canvas")).default;
          // Capture the board viewport perfectly
          const canvas = await html2canvas(board, { 
            backgroundColor: null,
            useCORS: true, 
            logging: false,
            scale: 1 // Keep resolution normal to reduce payload size
          });
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          base64Image = dataUrl.split(",")[1];
        }
      } catch (err) {
        console.warn("Failed to capture board image context for AI", err);
      }
    }

    const messageObj = {
      id: crypto.randomUUID(),
      userId: user.uid,
      userName: user.name || user.email?.split('@')[0],
      text: input,
      timestamp: Date.now(),
      imageContext: base64Image
    };

    socket.emit("send_chat", { roomId, message: messageObj });
    setInput("");
    setIsSending(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[180px] sm:bottom-6 right-6 lg:right-[190px] bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform hover:scale-105 z-[100000] flex items-center justify-center"
      >
        {isOpen ? <X size={24}/> : <MessageSquare size={24}/>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-[240px] sm:bottom-24 right-6 lg:right-[190px] w-[340px] h-[450px] bg-zinc-900/95 border border-zinc-700/50 rounded-2xl shadow-2xl flex flex-col z-[100000] overflow-hidden backdrop-blur-xl transition-all duration-300 ease-out animate-in slide-in-from-bottom-5">
          <div className="bg-zinc-800/80 p-4 border-b border-zinc-700/50 font-medium text-white flex justify-between items-center">
            <span className="flex items-center gap-2">
               <MessageSquare size={18} className="text-blue-400" />
               Room AI Chat
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-1 rounded-full uppercase tracking-wide">
               Use @AI
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <MessageSquare size={32} className="opacity-50" />
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs text-center max-w-[80%]">Ask the AI a question about your whitebord to get started!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.userId === user?.uid;
              const isAI = msg.userId === "AI";
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && <span className="text-[11px] text-zinc-400 font-medium ml-1 mb-1">{isAI ? "✨ AI Assistant" : msg.userName}</span>}
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[88%] text-[14px] leading-relaxed shadow-sm ${
                    isAI ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-tl-sm border border-indigo-400/30" :
                    isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-zinc-800/80 text-zinc-200 border border-zinc-700 rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

        {isSending && (
          <div className="flex justify-start px-2">
            <span className="text-[10px] text-zinc-400 animate-pulse flex items-center gap-2">
               🧠 AI is capturing the board...
            </span>
          </div>
        )}
        <form onSubmit={sendMessage} className="p-3 bg-zinc-800/50 border-t border-zinc-700/50 flex flex-col gap-2">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask @AI or chat..." 
              disabled={isSending}
              className="flex-1 bg-zinc-900 text-white rounded-full pl-4 pr-12 py-3 border border-zinc-700 focus:outline-none focus:border-blue-500 text-sm shadow-inner transition-colors disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isSending} 
              className="absolute right-2 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
            >
                <Send size={16} className="ml-[1px]" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
