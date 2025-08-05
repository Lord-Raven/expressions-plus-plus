import {motion, Variants} from "framer-motion";
import { Emotion } from "./Expressions";
import { Speaker } from "@chub-ai/stages-ts";
import { FC, useState, useEffect } from "react";
import { PARALLAX_STRENGTH } from "./DepthPlane";

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
}

const SpeakerImage: FC<SpeakerImageProps> = ({
    speaker, 
    emotion, 
    imageUrl, 
    xPosition, 
    yPosition, 
    zIndex, 
    isTalking, 
    alphaMode
}) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [previousState, setPreviousState] = useState<string>('absent');
    const currentState = isTalking ? 'talking' : 'idle';

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            // Calculate position relative to the viewport
            let x = (event.clientX / window.innerWidth) * 2 - 1;
            let y = -(event.clientY / window.innerHeight) * 2 + 1;
            // If window aspect ratio is > 9:16, image height is constrained, so multiply y by this ratio to keep parallax effect consistent with DepthPlane
            if (window.innerWidth / window.innerHeight > 9 / 16) {
                y *= (9 / 16) / (window.innerWidth / window.innerHeight);
            } else {
                // Otherwise, image width is constrained, so multiply x by this ratio
                x *= (window.innerHeight / window.innerWidth) / (9 / 16);
            }
            setMousePosition({ x, y });
        };

        // Add event listener to the entire document
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);
    
    useEffect(() => {
        setPreviousState(currentState);
    }, [currentState]);

    console.log(`mousePosition: ${mousePosition.x}, ${mousePosition.y}`);

    // Calculate final parallax position
    const tempY =  (isTalking ? 2 : (4 + yPosition));
    const depth = (48 - tempY) / 100; // depth between 0 and 0.48, I guess.
    const finalX = (isTalking ? 50 : xPosition) + ((alphaMode ? (-mousePosition.x * depth * PARALLAX_STRENGTH) : 0) * 100);
    const finalY = tempY + ((alphaMode ? (-mousePosition.y * depth * PARALLAX_STRENGTH) : 0) * 100);

    const variants: Variants = {
        absent: {
            color: '#BBBBBB', 
            opacity: 0, 
            x: `150vw`, 
            bottom: `${finalY}vh)`, 
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
            color: '#FFFFFF', 
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
            color: '#BBBBBB', 
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
            style={{position: 'absolute', width: 'auto', aspectRatio: '9 / 16', zIndex: 10, overflow: 'visible'}}>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', filter: 'blur(2.5px)', transform: 'translate(-50%, 0)', zIndex: 4}} alt={`${speaker.name} (${emotion})`}/>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', opacity: 0.75, transform: 'translate(-50%, 0)', zIndex: 5}} alt={`${speaker.name} (${emotion})`}/>
        </motion.div>) : <></>
};

export default SpeakerImage;