import {motion, Variants} from "framer-motion";
import { Speaker } from "@chub-ai/stages-ts";
import { FC, useState, useEffect, useRef } from "react";
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
    const [transitionDuration, setTransitionDuration] = useState(0.5);
    const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    // Determine current state, including 'absent' for initial and exit
    const [currentState, setCurrentState] = useState<'absent' | 'talking' | 'idle'>('absent');

    // Update currentState when isTalking changes
    useEffect(() => {
        setCurrentState(isTalking ? 'talking' : 'idle');
    }, [isTalking]);

    // Timer to drop transition duration after 0.5s when entering talking/idle
    useEffect(() => {
        if (currentState === 'talking' || currentState === 'idle') {
            setTransitionDuration(0.5);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setTransitionDuration(0.01), 500);
        }
        if (currentState === 'absent') {
            setTransitionDuration(0.5);
            if (timerRef.current) clearTimeout(timerRef.current);
        }
    }, [currentState]);

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
    
    // Timer to drop transition duration after 0.5s when entering talking/idle
    useEffect(() => {
        if (currentState === 'talking' || currentState === 'idle') {
            setTransitionDuration(0.5);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setTransitionDuration(0.01), 500);
        }
        if (currentState === 'absent') {
            setTransitionDuration(0.5);
            if (timerRef.current) clearTimeout(timerRef.current);
        }
    }, [currentState]);

    // Calculate final parallax position
    const tempY =  (isTalking ? 0 : (2 + yPosition));
    const depth = (50 - tempY) / 50;
    const finalX = (isTalking ? 50 : xPosition) + ((panX * depth * 1.8) * 100);
    const finalY = tempY + ((-panY * depth * 1.8) * 100);

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
            animate={currentState}
            onAnimationStart={(def) => {
                if (def === 'absent' || def === 'talking' || def === 'idle') {
                    setCurrentState(def);
                }
            }}
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