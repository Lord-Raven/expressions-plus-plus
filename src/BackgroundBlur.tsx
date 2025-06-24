import React from "react";

type BlurredGradientOverlayProps = {
  style?: React.CSSProperties;
  className?: string;
};

const BlurredGradientOverlay: React.FC<BlurredGradientOverlayProps> = ({
  style,
  className = "",
}) => {
  // Radial gradient: center is opaque (shows blur), edges are transparent (no blur)
  const mask =
    "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)";

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0, // fills parent
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
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
    </div>
  );
};

export default BlurredGradientOverlay;