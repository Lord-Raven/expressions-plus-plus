import {motion, Variants} from "framer-motion";
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
    alphaMode: boolean;
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
    alphaMode,
    highlightColor,
    panX,
    panY
}) => {
    const [previousState, setPreviousState] = useState<string>('');
    const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
    const currentState = isTalking ? 'talking' : 'idle';
    
    useEffect(() => {
        // Only set previous state if this is a change for currentState
        if (previousState) {
            setPreviousState(currentState);
        } else {
            setPreviousState('absent');
        }
    }, [currentState]);

    // Process image with color multiplication when in alpha mode
    useEffect(() => {
        if (!imageUrl || !alphaMode) {
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
    }, [imageUrl, highlightColor, alphaMode]);

    // Calculate final parallax position
    const tempY =  (isTalking ? 2 : (4 + yPosition));
    const depth = (48 - tempY) / 50;
    const finalX = (isTalking ? 50 : xPosition) + ((alphaMode ? (panX * depth * 1.2) : 0)) * 100;
    const finalY = tempY + ((alphaMode ? (-panY * depth * 1.2) : 0)) * 100;

    const variants: Variants = {
        absent: {
            opacity: 0, 
            x: `150vw`, 
            bottom: `${finalY}vh`, 
            height: `${IDLE_HEIGHT - yPosition * 2}vh`, 
            filter: 'brightness(0.8)', 
            zIndex: zIndex, 
            transition: {
                x: { ease: "easeOut", duration: 1.0 }, 
                bottom: { ease: "linear", duration: 1.0 }, 
                opacity: { ease: "easeOut", duration: 1.0 }
            }
        },
        talking: {
            opacity: 1, 
            x: `${finalX}vw`, 
            bottom: `${finalY}vh`, 
            height: `${SPEAKING_HEIGHT}vh`, 
            filter: 'brightness(1)', 
            zIndex: 100, 
            transition: previousState === 'absent' ? {
                x: { ease: "easeOut", duration: 1.0 }, 
                bottom: { ease: "linear", duration: 1.0 }, 
                opacity: { ease: "easeOut", duration: 1.0 }
            } : {
                x: { ease: "linear", duration: 0.01 }, 
                bottom: { ease: "linear", duration: 0.01 }, 
                opacity: { ease: "easeOut", duration: 0.01 }
            }
        },
        idle: {
            opacity: 1, 
            x: `${finalX}vw`,
            bottom: `${finalY}vh`, 
            height: `${IDLE_HEIGHT - yPosition * 2}vh`, 
            filter: 'brightness(0.8)', 
            zIndex: zIndex,
            transition: previousState === 'absent' ? {
                x: { ease: "easeOut", duration: 1.0 }, 
                bottom: { ease: "linear", duration: 1.0 }, 
                opacity: { ease: "easeOut", duration: 1.0 }
            } : {
                x: { ease: "linear", duration: 0.01 }, 
                bottom: { ease: "linear", duration: 0.01 }, 
                opacity: { ease: "easeOut", duration: 0.01 }
            }
        }
    };

    const imageToUse = alphaMode ? processedImageUrl : imageUrl;

    return imageToUse ? (
        <motion.div
            key={`speaker_motion_div_${speaker.anonymizedId}`}
            variants={variants}
            initial='absent'
            exit='absent'
            animate={currentState}
            style={{position: 'absolute', width: 'auto', aspectRatio: '9 / 16', overflow: 'visible'}}>
            
            {/* Blurred background layer */}
            <img 
                src={imageToUse} 
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
                src={imageToUse} 
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