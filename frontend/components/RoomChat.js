"use client";
import React, { useState, useEffect, useRef } from "react";
import { getSocket } from "../app/lib/socket";
import { MessageSquare, X, Send, Sparkle, Command } from "lucide-react";

export default function RoomChat({ roomId, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isOpen) return;

    socket.emit("get_chat_history", { roomId });

    const handleChatHistory = (history) => setMessages(history);
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
          const canvas = await html2canvas(board, { 
            backgroundColor: null,
            useCORS: true, 
            logging: false,
            scale: 1
          });
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          base64Image = dataUrl.split(",")[1];
        }
      } catch (err) {
        console.warn("AI capture failed", err);
      }
    }

    const messageObj = {
      id: crypto.randomUUID(),
      userId: user.uid,
      userName: user.displayName || user.email?.split('@')[0],
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
      {/* Polished Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 left-8 p-4 rounded-2xl shadow-2xl transition-all hover:scale-105 z-[100000] flex items-center justify-center border ${
          isOpen ? "bg-zinc-800 border-zinc-700 text-white" : "bg-emerald-500 border-emerald-400 text-zinc-950 shadow-emerald-500/20"
        }`}
      >
        {isOpen ? <X size={20}/> : <MessageSquare size={20}/>}
      </button>

      {/* Modern Tech-Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 left-8 w-[380px] h-[550px] bg-zinc-900/90 border border-zinc-800/80 rounded-[28px] shadow-2xl flex flex-col z-[100000] overflow-hidden backdrop-blur-3xl transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Sparkle size={16} className="text-emerald-400" />
               </div>
               <div>
                 <p className="text-xs font-bold uppercase tracking-widest text-white">System Logs</p>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Active Room Session</p>
               </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-zinc-950/50 border border-zinc-800 rounded-lg">
               <Command size={10} className="text-zinc-600" />
               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">@AI SUPPORT</span>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 hide-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50">
                <div className="p-4 rounded-full bg-zinc-800/30">
                  <MessageSquare size={24} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest">No active traffic</p>
                  <p className="text-[10px] max-w-[180px]">Initiate a prompt or organizational message.</p>
                </div>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.userId === user?.uid;
              const isAI = msg.userId === "AI";
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1.5`}>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                    {isAI ? "INTEL CORE" : (isMe ? "OPERATOR" : msg.userName)}
                  </p>
                  <div className={`px-4 py-3 rounded-2xl max-w-[90%] text-[13px] leading-relaxed shadow-sm border ${
                    isAI ? "bg-emerald-500/5 text-emerald-100 border-emerald-500/20" :
                    isMe ? "bg-zinc-800 text-white border-zinc-700" : "bg-zinc-100 text-zinc-950 border-zinc-200"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

        {/* Input Footer */}
        <div className="p-6 bg-zinc-900/60 border-t border-zinc-800/50">
          {isSending && (
            <div className="mb-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Capturing Workspace Data...
              </span>
            </div>
          )}
          <form onSubmit={sendMessage} className="relative group">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter command or message..." 
              disabled={isSending}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-5 pr-14 py-3.5 text-xs focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-zinc-700 font-medium"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isSending} 
              className="absolute right-2.5 top-2.5 p-1.5 bg-emerald-500 text-zinc-950 rounded-lg hover:bg-emerald-400 transition-all disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
      )}
    </>
  );
}
