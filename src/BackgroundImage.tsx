import { AnimatePresence, motion } from "framer-motion";
import { FC, useEffect, useRef, useState } from "react";
import {FastAverageColor} from "fast-average-color";

interface BackgroundImageProps {
    imageUrl: string;
}

const BackgroundImage: FC<BackgroundImageProps> = ({ imageUrl }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [borderColor, setBorderColor] = useState<string>("rgba(255,255,255,0.5)");

    useEffect(() => {
        if (!imageUrl) return;
        const fac = new FastAverageColor();
        const img = imgRef.current;
        if (!img) return;

        const handleLoad = () => {
            fac.getColorAsync(img)
                .then(color => setBorderColor(color.rgba))
                .catch(() => setBorderColor("rgba(255,255,255,0.5)"));
        };

        img.addEventListener("load", handleLoad);
        return () => img.removeEventListener("load", handleLoad);
    }, [imageUrl]);

    return (
        <AnimatePresence>
            {imageUrl && (
                <motion.div
                    key="background"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    style={{
                        position: "absolute",
                        left: "10vw",
                        top: "10vh",
                        width: "80vw",
                        height: "80vh",
                        borderRadius: "5vw",
                        overflow: "hidden", // This clips the image to the frame
                        zIndex: 3,
                        boxShadow: "5px 5px 40px 6px rgba(0, 0, 0, 0.37)",
                        border: `3px solid ${borderColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Background"
                        crossOrigin="anonymous"
                        style={{
                            position: "absolute",
                            left: "10vw",
                            bottom: "10vh",
                            width: "80vw",
                            height: "80vh",
                            objectFit: "cover",
                            filter: "blur(1px)",
                            userSelect: "none",
                            pointerEvents: "none",
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BackgroundImage;