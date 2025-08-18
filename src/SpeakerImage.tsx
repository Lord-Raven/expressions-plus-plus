import {motion, Variants, useMotionValue} from "framer-motion";
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
    // Timer-based transition duration
    const [transitionDuration, setTransitionDuration] = useState(0.3);
    const [processedImageUrl, setProcessedImageUrl] = useState<string>('');

    // Calculate final parallax position.
    const tempY =  (isTalking ? 0 : (2 + yPosition));
    const depth = (50 - tempY) / 50;
    const finalX = (isTalking ? 50 : xPosition) + ((panX * depth * 1.8) * 100);
    const finalY = tempY + ((-panY * depth * 1.8) * 100);

    // Track current animated position using Framer Motion
    const xMotion = useMotionValue(finalX * window.innerWidth / 100);
    const yMotion = useMotionValue(finalY * window.innerHeight / 100);

    // Snap or slow transition based on distance to target
    useEffect(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const targetX = finalX * vw / 100;
        const targetY = finalY * vh / 100;
        const currentX = xMotion.get();
        const currentY = yMotion.get();
        const distX = Math.abs(targetX - currentX);
        const distY = Math.abs(targetY - currentY);
        if (distX > 2 || distY > 2) {
            setTransitionDuration(0.3);
        } else {
            setTransitionDuration(0.01);
        }
        // Animate motion values to target
        xMotion.set(targetX);
        yMotion.set(targetY);
    }, [finalX, finalY]);

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

    const variants: Variants = {
        absent: {
            opacity: 0,
            x: `150vw`,
            bottom: `${finalY}vh`,
            height: `${IDLE_HEIGHT - yPosition * 2}vh`,
            filter: 'brightness(0.8)',
            zIndex: zIndex,
            transition: {
                x: { ease: "easeOut", duration: transitionDuration },
                bottom: { ease: "linear", duration: transitionDuration },
                opacity: { ease: "easeOut", duration: transitionDuration }
            }
        },
        talking: {
            opacity: 1,
            x: `${finalX}vw`,
            bottom: `${finalY}vh`,
            height: `${SPEAKING_HEIGHT}vh`,
            filter: 'brightness(1)',
            zIndex: 100,
            transition: {
                x: { ease: "easeOut", duration: transitionDuration },
                bottom: { ease: "linear", duration: transitionDuration },
                opacity: { ease: "easeOut", duration: transitionDuration }
            }
        },
        idle: {
            opacity: 1,
            x: `${finalX}vw`,
            bottom: `${finalY}vh`,
            height: `${IDLE_HEIGHT - yPosition * 2}vh`,
            filter: 'brightness(0.8)',
            zIndex: zIndex,
            transition: {
                x: { ease: "easeOut", duration: transitionDuration },
                bottom: { ease: "linear", duration: transitionDuration },
                opacity: { ease: "easeOut", duration: transitionDuration }
            }
        }
    };

    return processedImageUrl ? (
        <motion.div
            key={`speaker_motion_div_${speaker.anonymizedId}`}
            variants={variants}
            initial='absent'
            exit='absent'
            animate={isTalking ? 'talking' : 'idle'}
            style={{
                position: 'absolute',
                width: 'auto',
                aspectRatio: '9 / 16',
                overflow: 'visible',
                x: xMotion,
                y: yMotion
            }}
        >
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