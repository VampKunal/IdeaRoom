"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}) => {
  const [tabs, setTabs] = useState(propTabs);
  const [active, setActive] = useState(propTabs[0]);
  const [hovering, setHovering] = useState(false);

  const moveSelectedTabToTop = (idx) => {
    const newTabs = [...tabs];
    const selected = newTabs.splice(idx, 1);
    newTabs.unshift(selected[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
  };

  return (
    <>
      {/* TAB BUTTONS */}
      <div
        className={cn(
          "flex items-center gap-2 relative z-20",
          containerClassName
        )}
      >
        {tabs.map((tab, idx) => (
          <button
            key={tab.value}
            onClick={() => moveSelectedTabToTop(idx)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn(
              "relative px-4 py-2 rounded-full text-sm font-medium transition",
              "text-white/70 hover:text-white",
              tabClassName
            )}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="active-tab"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 rounded-full bg-white/10",
                  activeTabClassName
                )}
              />
            )}
            <span className="relative z-10">{tab.title}</span>
          </button>
        ))}
      </div>

      {/* STACKED CONTENT */}
      <FadeInDiv
        tabs={tabs}
        hovering={hovering}
        className={cn("mt-10", contentClassName)}
      />
    </>
  );
};

export const FadeInDiv = ({ tabs, hovering, className }) => {
  return (
    <motion.div
      layout
      className="relative w-full overflow-hidden"
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
    >
      {tabs.map((tab, idx) => {
        const isActive = idx === 0;

        return (
          <motion.div
            key={tab.value}
            layout
            layoutId={tab.value}
            style={{
              scale: 1 - idx * 0.06,
              zIndex: tabs.length - idx,
              pointerEvents: isActive ? "auto" : "none",
            }}
            animate={{
              opacity: isActive ? 1 : 0,
              y: isActive ? [0, 12, 0] : 0,
            }}
            transition={{ type: "spring", bounce: 0.25 }}
            className={cn(
              isActive ? "relative" : "absolute inset-0",
              className
            )}
          >
            {tab.content}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

