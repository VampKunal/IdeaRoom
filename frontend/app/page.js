"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { createRoom, getRoom, getMyRooms, deleteRoom } from "./lib/api";

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
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      const token = await user.getIdToken();
      await deleteRoom(id, token);
      setMyRooms(prev => prev.filter(r => r.roomId !== id));
    } catch (e) {
      setError("Failed to delete room");
    }
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <nav className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Idea Room
          </h1>
          <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                {user.displayName?.[0] || "U"}
              </div>
            )}
            <span className="text-sm font-medium">{user.displayName}</span>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-red-600/10 text-red-400 hover:bg-red-600/20 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* ACTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room */}
          <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Create New Room
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              Start a fresh infinite canvas for brainstorming.
            </p>
            <div className="flex flex-col gap-4">
              <input
                placeholder="Give your room a name..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 transition"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button
                onClick={handleCreate}
                disabled={isProcessing || !title}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Creating..." : "Create Room"}
              </button>
            </div>
          </div>

          {/* Join Room */}
          <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Join Existing Room
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              Paste a Room ID to collaborate with others.
            </p>
            <div className="flex flex-col gap-4">
              <input
                placeholder="Paste Room ID here..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 transition"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <button
                onClick={handleJoin}
                disabled={isProcessing || !roomId}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Joining..." : "Join Room"}
              </button>
            </div>
          </div>
        </div>


        {/* MY ROOMS GRID */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Your Rooms</h2>
          {myRooms.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700/30 border-dashed">
              <p className="text-gray-400">No rooms yet. Create one above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myRooms.map(room => (
                <div key={room.roomId} className="bg-gray-800/50 group hover:bg-gray-800 transition p-5 rounded-xl border border-gray-700/50 hover:border-gray-600 flex flex-col justify-between h-48 relative">
                  {/* Delete Action - Top Right */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(room.roomId); }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded text-red-400 transition"
                    title="Delete Room"
                  >
                    🗑️
                  </button>

                  <div>
                    <h3 className="font-bold text-lg mb-1 truncate pr-8">{room.title}</h3>
                    <p className="text-xs text-gray-500">Created {new Date(room.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => router.push(`/room/${room.roomId}`)}
                      className="w-full py-2 bg-gray-700 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium transition"
                    >
                      Open Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-3 rounded-xl backdrop-blur-md">
          {error}
        </div>
      )}
    </main>
  );
}
