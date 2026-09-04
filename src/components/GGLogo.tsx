import React from "react";

interface GGLogoProps {
  className?: string;
}

/**
 * Official G&G logo asset.
 * Keep the source artwork unchanged; this component only controls display size.
 */
export const GGLogo: React.FC<GGLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <img
      src="/gg-logo.png"
      className={className}
      alt="G&G"
      draggable={false}
    />
  );
};
