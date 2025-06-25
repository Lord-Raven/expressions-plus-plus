import { AnimatePresence, motion } from "framer-motion";
import { FC, useEffect, useRef, useState } from "react";
import {FastAverageColor} from "fast-average-color";

interface BackgroundImageProps {
    imageUrl: string;
}

const FRAME_START_LEFT = "100vw";
const FRAME_END_LEFT = "10vw";

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
                <>
                    <motion.div
                        key="background-frame"
                        initial={{ left: FRAME_START_LEFT, opacity: 0 }}
                        animate={{ left: FRAME_END_LEFT, opacity: 1 }}
                        exit={{ left: FRAME_START_LEFT, opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        style={{
                            position: "absolute",
                            top: "10vh",
                            width: "80vw",
                            height: "80vh",
                            borderRadius: "5vw",
                            overflow: "hidden",
                            zIndex: 2,
                            boxShadow: "5px 5px 40px 6px rgba(0, 0, 0, 0.37)",
                            border: `3px solid ${borderColor}`,
                            pointerEvents: "none"
                        }}
                    >
                        <motion.div
                            key="background-frame-offset"
                            initial={{ left: `-${FRAME_START_LEFT}`, opacity: 1 }}
                            animate={{ left: `-${FRAME_END_LEFT}`, opacity: 1 }}
                            exit={{ left: `-${FRAME_START_LEFT}`, opacity: 1 }}
                            transition={{ duration: 0.7 }}
                            style={{
                                position: "absolute",
                                top: " -10vh",
                                width: "100vw",
                                height: "100vh",
                            }}
                        >
                            <img
                                ref={imgRef}
                                src={imageUrl}
                                alt="Background"
                                crossOrigin="anonymous"
                                style={{
                                    position: "absolute",
                                    left: 0, // or any value you want
                                    top: "10vh",  // or any value you want
                                    width: "100vw",
                                    height: "80vh",
                                    objectFit: "cover",
                                    filter: "blur(1px)",
                                    userSelect: "none",
                                    pointerEvents: "none",
                                    zIndex: 1,
                                }}
                            />
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BackgroundImage;