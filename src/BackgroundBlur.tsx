import React from "react";

type BlurredGradientOverlayProps = {
  direction: "horizontal" | "vertical";
  style?: React.CSSProperties;
  className?: string;
};

const BlurredGradientOverlay: React.FC<BlurredGradientOverlayProps> = ({
  direction,
  style,
  className = "",
}) => {
  // Horizontal: left to right; Vertical: bottom to top
  const mask =
    direction === "horizontal"
      ? "linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,1) 100%)"
      : "linear-gradient(to top, rgba(0,0,0,0.1) 0%, rgba(0,0,0,1) 100%)";

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