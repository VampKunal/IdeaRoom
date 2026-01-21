"use client";

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Github, Chrome } from "lucide-react";

export default function AuthPage() {
    const { loginWithGoogle, user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);

    if (user) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
                <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                        <User size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
                    <p className="text-zinc-400 mb-6 font-medium">{user.displayName}</p>
                    <a
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all"
                    >
                        Go to Dashboard <ArrowRight size={18} />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-white p-4 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-full h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800/50 rounded-3xl shadow-2xl overflow-hidden relative z-10">
                {/* Header */}
                <div className="p-8 pb-0 text-center">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
                        Idea Room
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        Collaborate in real-time with infinite possibilities.
                    </p>
                </div>

                {/* Toggle Wrapper */}
                <div className="px-8 mt-8">
                    <div className="grid grid-cols-2 p-1 bg-zinc-950/50 rounded-xl border border-zinc-800">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`py-2.5 text-sm font-medium rounded-lg transition-all ${isLogin
                                ? "bg-zinc-800 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`py-2.5 text-sm font-medium rounded-lg transition-all ${!isLogin
                                ? "bg-zinc-800 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>
                </div>

                {/* Form Container */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {isLogin ? (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <LoginForm />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="signup"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SignupForm />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-4 text-zinc-500 font-medium tracking-wider">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={loginWithGoogle}
                        className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
                    >
                        {/* Simple Google SVG or Icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google
                    </button>

                    <p className="mt-6 text-center text-xs text-zinc-500">
                        By continuing, you agree to our <a href="#" className="underline hover:text-zinc-300">Terms of Service</a> and <a href="#" className="underline hover:text-zinc-300">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, type = "text", placeholder, value, onChange }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 ml-1">{label}</label>
            <div className="relative group">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-600"
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
            setError("Invalid credentials");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <InputField
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <div>
                <InputField
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex justify-end mt-1">
                    <a href="#" className="text-xs text-blue-500 hover:text-blue-400 font-medium">Forgot password?</a>
                </div>
            </div>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Signing In..." : "Sign In"}
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
            setError(e.message || "Failed to create account");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <InputField
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <InputField
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
                label="Password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Creating Account..." : "Create Account"}
            </button>
        </div>
    );
}
