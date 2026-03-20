"use client";
import React from "react";
import { motion } from "framer-motion";

export default function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#09090b]">
      {/* High-visibility Dot Grid */}
      <div 
        className="absolute inset-0 opacity-[0.25]" 
        style={{
          backgroundImage: `radial-gradient(#27272a 1.5px, transparent 1.5px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 95%)'
        }}
      />

      {/* Hero-specific background glow - focused behind the left section */}
      <motion.div
        animate={{
          opacity: [0.15, 0.3, 0.15],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[10%] left-[5%] w-[50%] h-[60%] rounded-full bg-emerald-500/20 blur-[140px]"
      />

      {/* Secondary glow behind the right section */}
      <motion.div
        animate={{
          opacity: [0.1, 0.2, 0.1],
          x: [0, 40, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[10%] right-[10%] w-[40%] h-[50%] rounded-full bg-zinc-500/10 blur-[110px]"
      />

      {/* Dynamic light sweep - more noticeable */}
      <motion.div
        animate={{
          left: ["-100%", "200%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
          delay: 5
        }}
        className="absolute top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-[30deg]"
      />

      {/* Very faint moving lines */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -100 }}
            animate={{ y: 2000 }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "linear",
              delay: i * 3
            }}
            className="w-px h-[200px] bg-gradient-to-b from-white to-transparent absolute"
            style={{ left: `${10 + i * 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}
