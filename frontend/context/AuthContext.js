"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Optional: Get token
                const token = await currentUser.getIdToken();
                // You might store it in a cookie if needed for SSR, or just use auth.currentUser
                console.log("User logged in:", currentUser.email);
            } else {
                console.log("User logged out");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            router.push("/");
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const loginWithEmail = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (error) {
            console.error("Email login failed:", error);
            throw error;
        }
    };

    const signupWithEmail = async (email, password, name) => {
        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            // Update profile with name
            if (name) {
                await updateProfile(res.user, { displayName: name });
            }
            router.push("/");
        } catch (error) {
            console.error("Signup failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            router.push("/auth");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
