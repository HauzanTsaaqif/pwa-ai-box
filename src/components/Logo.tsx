"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface LogoProps {
  className?: string;
  animated?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "splash" | "rounded";
  priority?: boolean;
}

const sizeMap = {
  sm: "w-12 h-12",
  md: "w-24 h-24 sm:w-28 sm:h-28",
  lg: "w-32 h-32 sm:w-44 sm:h-44",
  xl: "w-48 h-48 sm:w-64 sm:h-64",
};

export default function Logo({
  className = "",
  animated = true,
  size = "md",
  variant = "splash",
  priority = false,
}: LogoProps) {
  const Comp = animated ? motion.div : "div";
  const animProps = animated
    ? {
        animate: { scale: [1, 1.04, 1] },
        transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
      }
    : {};

  const logoSrc = variant === "rounded" ? "/logo-rounded.png" : "/logo-splash.png";

  return (
    <Comp
      {...animProps}
      className={`relative inline-block ${sizeMap[size]} ${className}`}
    >
      <Image
        src={logoSrc}
        alt="AI Box Logo"
        width={300}
        height={300}
        priority={priority}
        className="w-full h-full object-contain drop-shadow-2xl select-none"
      />
    </Comp>
  );
}

