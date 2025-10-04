import {motion, Variants, easeOut, easeIn, AnimatePresence} from "framer-motion";
import { Speaker } from "@chub-ai/stages-ts";
import {FC, useState, useEffect, useRef} from "react";
import { Emotion } from "./Emotion";

const IDLE_HEIGHT: number = 70;
const SPEAKING_HEIGHT: number = 80;

interface SpeakerImageProps {
    speaker: Speaker;
    emotion: Emotion;
    imageUrl: string;
    xPosition: number;
    yPosition: number;
    zIndex: number;
    isTalking: boolean;
    highlightColor: string;
    panX: number;
    panY: number;
}

const SpeakerImage: FC<SpeakerImageProps> = ({
    speaker,
    emotion,
    imageUrl,
    xPosition,
    yPosition,
    zIndex,
    isTalking,
    highlightColor,
    panX,
    panY
}) => {
    const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
    const [prevImageUrl, setPrevImageUrl] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<string>('9 / 16');
    const prevRawImageUrl = useRef<string>(imageUrl);

    // Process image with color multiplication
    useEffect(() => {
        if (!imageUrl) {
            setProcessedImageUrl(imageUrl);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
                // Set aspect ratio based on image dimensions
                if (img.naturalWidth && img.naturalHeight) {
                    setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
                }
            const result = multiplyImageByColor(img, highlightColor);
            if (result) {
                setProcessedImageUrl(result);
            }
        };
        img.src = imageUrl;
    }, [imageUrl, highlightColor]);

    // Track previous processed image for fade transition
    useEffect(() => {
        if (prevRawImageUrl.current !== imageUrl) {
            setPrevImageUrl(processedImageUrl);
            prevRawImageUrl.current = imageUrl;
        }
    }, [imageUrl, processedImageUrl]);

    // Calculate final parallax position
    const baseX = isTalking ? 50 : xPosition;
    const baseY = (isTalking ? 0 : (2 + yPosition));
    const depth = (50 - baseY) / 50;
    const modX = ((panX * depth * 1.8) * 100);
    const modY = ((panY * depth * 1.8) * 100);

    const variants: Variants = {
        absent: {
            opacity: 0,
            x: `150vw`,
            bottom: `${baseY}vh`,
            height: `${IDLE_HEIGHT - yPosition * 2}vh`,
            filter: 'brightness(0.8)',
            zIndex: zIndex,
            transition: { x: { ease: easeIn, duration: 0.5 }, bottom: { duration: 0.5 }, opacity: { ease: easeOut, duration: 0.5 } }
        },
        talking: {
            opacity: 1,
            x: `${baseX}vw`,
            bottom: `${baseY}vh`,
            height: `${SPEAKING_HEIGHT}vh`,
            filter: 'brightness(1)',
            zIndex: 100,
            transition: { x: { ease: easeIn, duration: 0.3 }, bottom: { duration: 0.3 }, opacity: { ease: easeOut, duration: 0.3 } }
        },
        idle: {
            opacity: 1,
            x: `${baseX}vw`,
            bottom: `${baseY}vh`,
            height: `${IDLE_HEIGHT - yPosition * 2}vh`,
            filter: 'brightness(0.8)',
            zIndex: zIndex,
            transition: { x: { ease: easeIn, duration: 0.3 }, bottom: { duration: 0.3 }, opacity: { ease: easeOut, duration: 0.3 } }
        }
    };

    return processedImageUrl ? (
        <motion.div
            key={`speaker_motion_div_${speaker.anonymizedId}`}
            variants={variants}
            initial='absent'
            exit='absent'
            animate={isTalking ? 'talking' : 'idle'}
            style={{position: 'absolute', width: 'auto', aspectRatio, overflow: 'visible'}}>
            {/* Blurred background layer */}
            <AnimatePresence>
                {prevImageUrl && prevImageUrl !== processedImageUrl && (
                    <motion.img
                        key="prev"
                        src={prevImageUrl}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            width: '100%',
                            height: '100%',
                            filter: 'blur(2.5px)',
                            zIndex: 4,
                            transform: `translate(calc(${modX}vw - 50%), ${modY}vh)`,
                        }}
                        alt={`${speaker.name} (${emotion}) previous`}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {processedImageUrl && (
                    <motion.img
                        key={processedImageUrl}
                        src={processedImageUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            width: '100%',
                            height: '100%',
                            filter: 'blur(2.5px)',
                            zIndex: 4,
                            transform: `translate(calc(${modX}vw - 50%), ${modY}vh)`,
                        }}
                        alt={`${speaker.name} (${emotion}) background`}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {processedImageUrl && (
                    <motion.img
                        key={processedImageUrl + "_main"}
                        src={processedImageUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.75 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0.75,
                            zIndex: 5,
                            transform: `translate(calc(${modX}vw - 50%), ${modY}vh)`,
                        }}
                        alt={`${speaker.name} (${emotion})`}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    ) : <></>;
};

const multiplyImageByColor = (img: HTMLImageElement, hex: string): string | null => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Apply color multiplication
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = hex.toUpperCase();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Preserve original alpha channel
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL();
};

export default SpeakerImage;