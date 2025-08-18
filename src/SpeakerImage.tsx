import {motion, Variants, easeOut} from "framer-motion";
import { Speaker } from "@chub-ai/stages-ts";
import { FC, useState, useEffect } from "react";
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
    // Remove transitionDuration state, use dynamic transition instead
    const [processedImageUrl, setProcessedImageUrl] = useState<string>('');

    // Process image with color multiplication
    useEffect(() => {
        if (!imageUrl) {
            setProcessedImageUrl(imageUrl);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const result = multiplyImageByColor(img, highlightColor);
            if (result) {
                setProcessedImageUrl(result);
            }
        };
        img.src = imageUrl;
    }, [imageUrl, highlightColor]);

    // Calculate final parallax position
    const tempY =  (isTalking ? 0 : (2 + yPosition));
    const depth = (50 - tempY) / 50;
    const finalX = (isTalking ? 50 : xPosition) + ((panX * depth * 1.8) * 100);
    const finalY = tempY + ((-panY * depth * 1.8) * 100);

    // Calculate previous position for snap logic
    const [prevPos, setPrevPos] = useState<{x: number, y: number}>({x: 150, y: finalY});
    useEffect(() => {
        setPrevPos({x: finalX, y: finalY});
    }, [finalX, finalY]);

    // Calculate distance to target
    const distance = Math.hypot(prevPos.x - finalX, prevPos.y - finalY);
    const snapThreshold = 5; // Adjust as needed

    // Dynamic transition: snap if close, animate if far
    const dynamicTransition = distance < snapThreshold
        ? { x: { duration: 0 }, bottom: { duration: 0 }, opacity: { duration: 0 } }
        : { x: { ease: easeOut, duration: 0.3 }, bottom: { duration: 0.3 }, opacity: { ease: easeOut, duration: 0.3 } };
    
    const variants: Variants = {
        absent: {
            opacity: 0,
            x: `150vw`,
            bottom: `${finalY}vh`,
            height: `${IDLE_HEIGHT - yPosition * 2}vh`,
            filter: 'brightness(0.8)',
            zIndex: zIndex,
            transition: { x: { ease: easeOut, duration: 0.3 }, bottom: { duration: 0.3 }, opacity: { ease: easeOut, duration: 0.3 } }
        },
        talking: {
            opacity: 1,
            x: `${finalX}vw`,
            bottom: `${finalY}vh`,
            height: `${SPEAKING_HEIGHT}vh`,
            filter: 'brightness(1)',
            zIndex: 100,
            transition: dynamicTransition
        },
        idle: {
            opacity: 1,
            x: `${finalX}vw`,
            bottom: `${finalY}vh`,
            height: `${IDLE_HEIGHT - yPosition * 2}vh`,
            filter: 'brightness(0.8)',
            zIndex: zIndex,
            transition: dynamicTransition
        }
    };

    return processedImageUrl ? (
        <motion.div
            key={`speaker_motion_div_${speaker.anonymizedId}`}
            variants={variants}
            initial='absent'
            exit='absent'
            animate={isTalking ? 'talking' : 'idle'}
            style={{position: 'absolute', width: 'auto', aspectRatio: '9 / 16', overflow: 'visible'}}>
            {/* Blurred background layer */}
            <img 
                src={processedImageUrl} 
                style={{
                    position: 'absolute', 
                    top: 0, 
                    width: '100%', 
                    height: '100%', 
                    filter: 'blur(2.5px)', 
                    transform: 'translate(-50%, 0)', 
                    zIndex: 4
                }} 
                alt={`${speaker.name} (${emotion}) background`}
            />
            {/* Main image layer */}
            <img 
                src={processedImageUrl} 
                style={{
                    position: 'absolute', 
                    top: 0, 
                    width: '100%', 
                    height: '100%', 
                    opacity: 0.75, 
                    transform: 'translate(-50%, 0)', 
                    zIndex: 5
                }} 
                alt={`${speaker.name} (${emotion})`}
            />
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