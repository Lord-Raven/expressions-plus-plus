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
    const [previousState, setPreviousState] = useState<string>('absent');
    const currentState = isTalking ? 'talking' : 'idle';
    
    useEffect(() => {
        setPreviousState(currentState);
    }, [currentState]);

    // Calculate final parallax position
    const tempY =  (isTalking ? 2 : (4 + yPosition));
    const depth = (48 - tempY) / 50;
    const finalX = (isTalking ? 50 : xPosition) + ((alphaMode ? (panX * depth * 1.2) : 0)) * 100;
    const finalY = tempY + ((alphaMode ? (-panY * depth * 1.2) : 0)) * 100;

    const variants: Variants = {
        absent: {
            color: highlightColor, 
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
            color: highlightColor, 
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
            color: highlightColor, 
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

    return imageUrl ? (
        <motion.div
            key={`speaker_motion_div_${speaker.anonymizedId}`}
            variants={variants}
            initial='absent'
            exit='absent'
            animate={currentState}
            style={{position: 'absolute', width: 'auto', aspectRatio: '9 / 16', overflow: 'visible'}}>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', filter: 'blur(2.5px)', transform: 'translate(-50%, 0)', zIndex: 4}} alt={`${speaker.name} (${emotion})`}/>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', opacity: 0.75, transform: 'translate(-50%, 0)', zIndex: 5}} alt={`${speaker.name} (${emotion})`}/>

        </motion.div>) : <></>
};

export default SpeakerImage;