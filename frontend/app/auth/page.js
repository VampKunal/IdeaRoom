"use client";

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Compass, ShieldCheck, Zap, Globe, Cpu } from "lucide-react";

export default function AuthPage() {
    const { loginWithGoogle, user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);

    if (user) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 blur-[150px] pointer-events-none animate-pulse" />
                <div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-10 text-center backdrop-blur-2xl shadow-2xl relative z-10 scale-105">
                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center mb-8 animate-bounce transition-all">
                        <User size={32} className="text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter mb-4 text-white uppercase italic">Access Granted</h2>
                    <p className="text-zinc-500 mb-10 text-[10px] font-bold uppercase tracking-[0.3em] font-mono leading-relaxed">
                        Session: Active<br/>
                        Node: {user.displayName?.toUpperCase()}
                    </p>
                    <a
                        href="/"
                        className="inline-flex items-center justify-center gap-4 w-full py-5 bg-emerald-500 text-zinc-950 font-black rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] text-sm tracking-widest uppercase"
                    >
                        INITIATE DASHBOARD <ArrowRight size={20} />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col lg:flex-row bg-[#09090b] text-white overflow-hidden font-sans relative">
            
            {/* Ambient Background Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[10%] w-[50%] h-[50%] bg-emerald-500/[0.07] blur-[150px] rounded-full" />
                <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-zinc-500/[0.05] blur-[150px] rounded-full" />
            </div>

            {/* Left Side: Illustration / Branding (Visible on Desktop) */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative items-center justify-center p-12 xl:p-20 z-10 border-r border-zinc-800/30">
                <div className="max-w-xl space-y-10">
                    <div className="space-y-6">
                        <div className="w-12 h-12 rounded-[18px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Compass className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h1 className="text-6xl xl:text-7xl font-black tracking-tighter text-white leading-[0.9] uppercase italic">
                            ENGINEER<br/>
                            <span className="text-zinc-600 not-italic">TOGETHER.</span>
                        </h1>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-800/50">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <Zap size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Real-time Optix</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed max-w-[180px]">
                                Sub-50ms latency for global collaborative sessions.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Cpu size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">AI Synthesis</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed max-w-[180px]">
                                Neural processing for structural diagram transformation.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute left-10 bottom-10 opacity-[0.05] pointer-events-none">
                   <div className="text-[150px] font-black text-white leading-none select-none tracking-tighter">01</div>
                </div>
            </div>

            {/* Right Side: Form Container */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-12 z-10">
                <div className="w-full max-w-[440px]">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900/40 border border-zinc-800/60 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-3xl p-1"
                    >
                        <div className="bg-zinc-900/60 rounded-[30px] p-8 lg:p-10">
                            {/* Mobile Logo */}
                            <div className="lg:hidden text-center mb-8">
                                <div className="mx-auto w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                                    <Compass className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h2 className="text-xl font-black tracking-tighter uppercase text-white">IDEAROOM</h2>
                            </div>

                            <div className="mb-8 text-center lg:text-left">
                                <h2 className="text-2xl font-bold tracking-tight text-white mb-1 uppercase tracking-tighter italic">Authorize Node</h2>
                                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Secure Entry Point</p>
                            </div>

                            {/* Toggle Container */}
                            <div className="grid grid-cols-2 p-1 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 mb-8">
                                <button
                                    onClick={() => setIsLogin(true)}
                                    className={`py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all ${isLogin
                                        ? "bg-zinc-800 text-white shadow-xl"
                                        : "text-zinc-600 hover:text-zinc-400"
                                        }`}
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => setIsLogin(false)}
                                    className={`py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all ${!isLogin
                                        ? "bg-zinc-800 text-white shadow-xl"
                                        : "text-zinc-600 hover:text-zinc-400"
                                        }`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {isLogin ? (
                                    <motion.div
                                        key="login"
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 5 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <LoginForm />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="signup"
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 5 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <SignupForm />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-zinc-800/50"></div>
                                </div>
                                <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em]">
                                    <span className="bg-zinc-900 px-4 text-zinc-600">External Provider</span>
                                </div>
                            </div>

                            <button
                                onClick={loginWithGoogle}
                                className="w-full flex items-center justify-center gap-4 bg-zinc-100 text-zinc-950 font-black py-4 rounded-[18px] hover:bg-white transition-all text-[11px] uppercase tracking-widest shadow-lg shadow-black/20"
                            >
                                <Globe size={16} />
                                Google Identity
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, type = "text", placeholder, value, onChange }) {
    return (
        <div className="space-y-2.5">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</label>
                {type === "password" && (
                     <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">Reset</a>
                )}
            </div>
            <div className="relative group">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3.5 text-xs focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-800 font-medium"
                />
            </div>
        </div>
    );
}

function LoginForm() {
    const { loginWithEmail } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!email || !password) return;
        setLoading(true);
        setError("");
        try {
            await loginWithEmail(email, password);
        } catch (e) {
            setError("Authorization failure - Invalid keys.");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <InputField
                label="System Identifier"
                type="email"
                placeholder="operator@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
                label="Access Key"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-emerald-400 text-[9px] font-bold text-center uppercase tracking-widest animate-pulse">{error}</p>}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4.5 rounded-[18px] shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] disabled:opacity-50 text-[11px] uppercase tracking-[0.2em]"
            >
                {loading ? "Initializing..." : "Authorize"}
            </button>
        </div>
    );
}

function SignupForm() {
    const { signupWithEmail } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!email || !password || !name) return;
        setLoading(true);
        setError("");
        try {
            await signupWithEmail(email, password, name);
        } catch (e) {
            setError("Initialization failure.");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <InputField
                label="Identity Display"
                type="text"
                placeholder="Operator Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <InputField
                label="System Identifier"
                type="email"
                placeholder="operator@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
                label="Access Key"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-emerald-400 text-[9px] font-bold text-center uppercase tracking-widest animate-pulse">{error}</p>}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-black py-4.5 rounded-[18px] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-[11px] uppercase tracking-[0.2em]"
            >
                {loading ? "Staging..." : "Initialize"}
            </button>
        </div>
    );
}
