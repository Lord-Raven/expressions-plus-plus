import React from "react";

type BlurredGradientOverlayProps = {
  style?: React.CSSProperties;
  className?: string;
};

const BlurredGradientOverlay: React.FC<BlurredGradientOverlayProps> = ({
  style,
  className = "",
}) => {
  // Radial gradient: center is opaque, edges are transparent
  const mask =
    "radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)";

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 2,
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </div>
  );
};

export default BlurredGradientOverlay;