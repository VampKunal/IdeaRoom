"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LogOut,
  Trash2,
  Folder,
  History,
  Terminal,
  Box,
  Sprout,
  Zap
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createRoom, getRoom, getMyRooms, deleteRoom, pingApiHealth } from "./lib/api";
import BackgroundAnimation from "../components/BackgroundAnimation";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roomId, setRoomId] = useState("");
  const [myRooms, setMyRooms] = useState([]);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  /** Real network + API metrics for Network Status card */
  const [networkStats, setNetworkStats] = useState({
    online: true,
    effectiveType: null,
    downlink: null,
    rtt: null,
    apiLatencyMs: null,
    apiReachable: null,
    latencyHistory: [],
  });

  const readNavigatorConnection = useCallback(() => {
    if (typeof navigator === "undefined") return { effectiveType: null, downlink: null, rtt: null };
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return { effectiveType: null, downlink: null, rtt: null };
    return {
      effectiveType: c.effectiveType ?? null,
      downlink: typeof c.downlink === "number" ? c.downlink : null,
      rtt: typeof c.rtt === "number" ? c.rtt : null,
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setNetworkStats((s) => ({ ...s, online: true }));
    const onOffline = () => setNetworkStats((s) => ({ ...s, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setNetworkStats((s) => ({ ...s, online: navigator.onLine }));

    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const onConnChange = () => {
      setNetworkStats((s) => ({ ...s, ...readNavigatorConnection() }));
    };
    onConnChange();
    c?.addEventListener?.("change", onConnChange);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      c?.removeEventListener?.("change", onConnChange);
    };
  }, [readNavigatorConnection]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { latencyMs } = await pingApiHealth();
        if (cancelled) return;
        setNetworkStats((s) => ({
          ...s,
          apiLatencyMs: latencyMs,
          apiReachable: true,
          latencyHistory: [...s.latencyHistory.slice(-19), latencyMs],
        }));
      } catch {
        if (cancelled) return;
        setNetworkStats((s) => ({
          ...s,
          apiLatencyMs: null,
          apiReachable: false,
        }));
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  const latencyBadge = useMemo(() => {
    if (!networkStats.online) return "OFFLINE";
    if (networkStats.apiReachable === false) return "API DOWN";
    if (networkStats.apiLatencyMs == null) return "…";
    const ms = networkStats.apiLatencyMs;
    if (ms < 120) return "LOW LATENCY";
    if (ms < 280) return "MODERATE";
    return "HIGH LATENCY";
  }, [networkStats.online, networkStats.apiReachable, networkStats.apiLatencyMs]);

  const sparklinePath = useMemo(() => {
    const vals = networkStats.latencyHistory;
    if (vals.length < 2) return "";
    const w = 120;
    const h = 48;
    const pad = 6;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rng = max - min || 1;
    const step = (w - pad * 2) / (vals.length - 1);
    return vals
      .map((v, i) => {
        const x = pad + i * step;
        const y = h - pad - ((v - min) / rng) * (h - pad * 2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [networkStats.latencyHistory]);

  const barHeights = useMemo(() => {
    const vals = networkStats.latencyHistory.slice(-7);
    if (!vals.length) return [];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rng = max - min || 1;
    return vals.map((v) => Math.round(((v - min) / rng) * 100) || 8);
  }, [networkStats.latencyHistory]);

  // Mouse-based parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const heroShiftX = useTransform(mouseX, [-1, 1], [-8, 8]);
  const heroShiftY = useTransform(mouseY, [-1, 1], [-6, 6]);

  function handleMouseMove(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    mouseX.set(Math.max(-1, Math.min(1, dx)));
    mouseY.set(Math.max(-1, Math.min(1, dy)));
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(token => {
      getMyRooms(token)
        .then(setMyRooms)
        .catch(e => console.error(e));
    });
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
      cancel: { label: "Cancel" }
    });
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full overflow-hidden items-center justify-center bg-[#09090b] text-[#fafafa]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-6 w-6 bg-emerald-500 rounded-full animate-bounce"></div>
          <p className="text-zinc-500 font-medium tracking-tight">Accessing Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden text-[#fafafa] flex flex-col font-sans bg-[#09090b]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Layer - High Visibility */}
      <div className="fixed inset-0 z-0">
        <BackgroundAnimation />
        <div className="absolute top-[10%] left-[5%] w-[50%] h-[40%] bg-emerald-500/10 blur-[200px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[40%] bg-zinc-500/5 blur-[150px] pointer-events-none" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        <style jsx global>{`
          .hide-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
          .hide-scrollbar { scrollbar-width: none; }
        `}</style>

        {/* Header */}
        <motion.nav
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto w-full px-10 py-8 z-20 flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-lg font-bold tracking-tighter text-white flex items-center gap-2">
                IDEAROOM
                <span className="text-[10px] font-bold text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-[0.2em]">
                  Standard
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 pr-4 border-r border-zinc-800">
                <span className="text-xs font-medium text-zinc-400 truncate max-w-[120px]">{user.displayName}</span>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-7 h-7 rounded-full object-cover border border-zinc-800 grayscale hover:grayscale-0 transition-all"
                  />
                ) : (
                  <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {user.displayName?.[0] || "U"}
                  </div>
                )}
              </div>
              <motion.button
                whileHover={{ color: "#fff" }}
                onClick={logout}
                className="text-zinc-500 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </motion.button>
            </div>
          </div>
        </motion.nav>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center z-10 min-h-0 relative">

          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-12 py-12">
            <motion.section
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ translateX: heroShiftX, translateY: heroShiftY }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-3 text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-400">
                <span className="h-[1px] w-6 bg-emerald-500/40" />
                Collaborative Momentum
              </div>
              <h1 className="text-7xl lg:text-[100px] font-black leading-[0.85] tracking-tight">
                BUILD<br />
                <span className="text-zinc-500">TOGETHER.</span>
              </h1>
              <p className="text-lg text-zinc-400 max-w-lg leading-relaxed font-normal">
                A high-precision canvas for technical teams to map architecture and ship complex ideas.
              </p>
            </motion.section>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-md space-y-5 hover:border-emerald-500/20 transition-all duration-500">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Box size={20} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-tight text-white uppercase">New Environment</h3>
                  <div className="flex gap-3">
                    <input
                      placeholder="Workspace name..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                    <button
                      onClick={handleCreate}
                      disabled={!title.trim() || isProcessing}
                      className="w-28 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg disabled:opacity-30 transition-all text-xs font-bold"
                    >
                      DEPLOY
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-md space-y-5 hover:border-zinc-400/20 transition-all duration-500">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <Terminal size={20} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-tight text-white uppercase">Interface ID</h3>
                  <div className="flex gap-3">
                    <input
                      placeholder="Enter ID..."
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                    <button
                      onClick={handleJoin}
                      disabled={!roomId.trim() || isProcessing}
                      className="w-28 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg disabled:opacity-30 transition-all text-xs font-bold"
                    >
                      JOIN
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column — Network Status (top) + Active History (reference layout) */}
          <div className="lg:col-span-5 flex flex-col gap-6 py-12 max-h-full min-h-0">
            {/* Network Status + real-time viz */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="shrink-0 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 backdrop-blur-md overflow-hidden shadow-[0_0_0_1px_rgba(24,24,27,0.5)]"
            >
              <div className="p-6 flex items-start justify-between gap-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Zap className="text-emerald-400" size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300">
                      Network Status
                    </h2>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5 truncate">
                      {networkStats.online ? "Online" : "Offline"}
                      {networkStats.effectiveType ? ` · ${networkStats.effectiveType}` : ""}
                      {networkStats.downlink != null ? ` · ${networkStats.downlink.toFixed(1)} Mbps down` : ""}
                      {networkStats.rtt != null ? ` · ~${networkStats.rtt}ms rtt` : ""}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                      API:{" "}
                      {networkStats.apiLatencyMs != null
                        ? `${networkStats.apiLatencyMs}ms`
                        : networkStats.apiReachable === false
                          ? "unreachable"
                          : "…"}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/25 shadow-[0_0_20px_rgba(16,185,129,0.15)] max-w-[140px] text-center leading-tight">
                  {latencyBadge}
                </span>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/60 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                    API latency (ms)
                  </p>
                  <svg viewBox="0 0 120 48" className="w-full h-14" preserveAspectRatio="none">
                    {sparklinePath ? (
                      <path
                        d={sparklinePath}
                        fill="none"
                        stroke="rgb(52,211,153)"
                        strokeWidth="1.5"
                        className="drop-shadow-[0_0_8px_rgba(52,211,153,0.45)]"
                      />
                    ) : (
                      <text x="60" y="28" textAnchor="middle" className="fill-zinc-600 text-[8px] font-mono">
                        {networkStats.apiReachable === false ? "No data" : "Collecting…"}
                      </text>
                    )}
                  </svg>
                </div>
                <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/60 p-3 flex flex-col justify-end">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                    Recent pings
                  </p>
                  <div className="flex items-end justify-between gap-1 h-12 px-1">
                    {(barHeights.length ? barHeights : [0, 0, 0, 0, 0, 0, 0]).map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-emerald-600/30 to-emerald-400/80 min-w-[6px]"
                        style={{ height: `${Math.max(h, 4)}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col min-h-0 bg-zinc-900/30 border border-zinc-800/30 rounded-3xl overflow-hidden backdrop-blur-sm"
            >
              <div className="p-8 pb-4 flex items-center justify-between shrink-0 border-b border-zinc-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
                    <History className="text-emerald-500" size={16} />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                    Active History
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-zinc-500">
                  {myRooms.length} FOUND
                </span>
              </div>

              <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-8">
                {myRooms.length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center text-zinc-600 gap-4 py-8">
                    <Folder size={32} className="opacity-50" />
                    <p className="text-xs font-medium max-w-[200px] leading-relaxed">
                      No active engineering logs found.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {myRooms.map((room, i) => (
                      <motion.div
                        key={room.roomId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => router.push(`/room/${room.roomId}`)}
                        className="group py-4 flex items-center justify-between first:pt-2 hover:bg-zinc-800/20 transition-all cursor-pointer -mx-2 px-2 rounded-lg"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 group-hover:bg-emerald-400 transition-colors shrink-0" />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-zinc-100 truncate tracking-tight">
                              {room.title}
                            </h4>
                            <p className="text-[10px] text-zinc-600 font-mono mt-0.5 uppercase">
                              Modified{" "}
                              {new Date(room.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(room.roomId);
                          }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full px-10 py-6 flex items-center justify-between opacity-40 text-[9px] font-bold tracking-[0.4em] uppercase text-zinc-600 z-10 shrink-0">
          <div>IDEAROOM &copy; 2024</div>
          <div>V 0.1.0</div>
        </footer>
      </div>

      {error && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 30, x: "-50%" }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-100 text-zinc-950 px-5 py-2.5 rounded-lg shadow-2xl z-[100] text-xs font-bold uppercase tracking-widest"
          >
            {error}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
