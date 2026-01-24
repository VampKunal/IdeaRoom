"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { createRoom, getRoom, getMyRooms, deleteRoom } from "./lib/api";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { motion } from "framer-motion";
import { Plus, LogOut, Trash2, ArrowRight, LayoutGrid, Search } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roomId, setRoomId] = useState("");
  const [myRooms, setMyRooms] = useState([]);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  // Fetch My Rooms
  useEffect(() => {
    if (user) {
      user.getIdToken().then(token => {
        getMyRooms(token)
          .then(setMyRooms)
          .catch(e => console.error(e));
      });
    }
  }, [user]);

  async function handleCreate() {
    if (!title.trim()) return;
    setIsProcessing(true);
    try {
      const token = await user.getIdToken();
      const room = await createRoom(title, token);
      router.push(`/room/${room.roomId}`);
    } catch {
      setError("Failed to create room");
      setIsProcessing(false);
    }
  }

  async function handleJoin() {
    if (!roomId.trim()) return;
    setIsProcessing(true);
    try {
      await getRoom(roomId);
      router.push(`/room/${roomId}`);
    } catch {
      setError("Room does not exist");
      setIsProcessing(false);
    }
  }

  async function handleDelete(id) {
    toast("Delete this room?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const token = await user.getIdToken();
            await deleteRoom(id, token);
            setMyRooms(prev => prev.filter(r => r.roomId !== id));
            toast.success("Room deleted");
          } catch (e) {
            toast.error("Failed to delete room");
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 bg-blue-500 rounded-full animate-bounce"></div>
          <p className="text-gray-400 font-medium">Loading Idea Room...</p>
        </div>
      </div>
    );
  }

  return (
    <AuroraBackground>
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3h8v8H3V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 3h8v8h-8V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 13h8v8H3v-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13h3v3h-3v-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 19h3v3h-3v-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 16h3v3h-3v-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                IdeaRoom
              </h1>
              <span className="text-xs text-blue-300 font-medium tracking-wider uppercase">Beta</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-white/5 pl-2 pr-4 py-1.5 rounded-full border border-white/5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border-2 border-white/10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              {/* Fallback */}
              <div
                className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ display: user.photoURL ? 'none' : 'flex' }}
              >
                {user.displayName?.[0] || "U"}
              </div>
              <span className="text-sm font-medium text-gray-300">{user.displayName}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
          {/* Left Column: Actions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Get Started</h2>
              <p className="text-gray-400 mb-8 text-sm">Create a new space for your ideas or join an existing session.</p>

              {/* Create Room */}
              <div className="mb-8 space-y-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">New Room</label>
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative flex gap-2">
                    <input
                      placeholder="Project Name..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-zinc-900 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600"
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                    <button
                      onClick={handleCreate}
                      disabled={isProcessing || !title}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-white/5 mb-8"></div>

              {/* Join Room */}
              <div className="space-y-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Join Session</label>
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative flex gap-2">
                    <input
                      placeholder="Room ID..."
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="w-full bg-zinc-900 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-600"
                      onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    />
                    <button
                      onClick={handleJoin}
                      disabled={isProcessing || !roomId}
                      className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                    >
                      <ArrowRight size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Library */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 bg-zinc-900/30 backdrop-blur-md rounded-3xl border border-white/5 p-6 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Your Rooms
                </h2>
                <div className="bg-white/5 rounded-lg p-1 flex">
                  <button className="px-3 py-1 bg-white/10 rounded-md text-xs font-medium text-white shadow-sm">All</button>
                  <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-300 transition">Recent</button>
                </div>
              </div>

              {myRooms.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 border-2 border-dashed border-white/5 rounded-2xl m-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <LayoutGrid className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="text-gray-400 font-medium">No rooms yet</p>
                  <p className="text-gray-600 text-sm mt-1">Create one to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                  {myRooms.map((room, i) => (
                    <motion.div
                      key={room.roomId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.3 }}
                      onClick={() => router.push(`/room/${room.roomId}`)}
                      className="group relative bg-zinc-800/40 hover:bg-zinc-800/80 p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between h-40"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-2xl transition-all duration-500"></div>

                      <div className="relative z-10">
                        <h3 className="font-bold text-lg text-gray-200 group-hover:text-white transition line-clamp-1">{room.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Modified {new Date(room.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="relative z-10 flex items-center justify-between mt-4">
                        <div className="flex -space-x-2">
                          {/* Fake avatars for visual effect if we had collaborators */}
                          <div className="w-6 h-6 rounded-full bg-blue-500 border border-zinc-900 flex items-center justify-center text-[8px] text-white font-bold">You</div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(room.roomId); }}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition"
                          title="Delete Room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-gray-600 text-xs"
        >
          <p>© 2026 Idea Room. Crafted with creativity.</p>
        </motion.div>
      </div >

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          className="fixed bottom-8 left-1/2 bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-3 rounded-xl backdrop-blur-md shadow-xl"
        >
          {error}
        </motion.div>
      )
      }
    </AuroraBackground >
  );
}
