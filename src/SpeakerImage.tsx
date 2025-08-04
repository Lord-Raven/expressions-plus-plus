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

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            // Calculate position relative to the viewport
            const x = (event.clientX / window.innerWidth) * 2 - 1;
            const y = -(event.clientY / window.innerHeight) * 2 + 1;
            setMousePosition({ x, y });
        };

        // Add event listener to the entire document
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Calculate final parallax position
    const tempY =  (isTalking ? 2 : (4 + yPosition));
    const depth = (48 - tempY) / 50;
    const finalX = (isTalking ? 50 : xPosition) + ((alphaMode ? (- mousePosition.x * depth * PARALLAX_STRENGTH) : 0) * 100);
    const finalY = tempY + ((alphaMode ? (- mousePosition.y * depth * PARALLAX_STRENGTH) : 0) * 100);

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
                x: { ease: "easeOut", duration: 0.8 }, 
                bottom: { ease: "linear", duration: 0.1 }, 
                opacity: { ease: "easeOut", duration: 0.3 }
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
            transition: {
                x: { ease: "linear", duration: 0.1 }, 
                bottom: { ease: "linear", duration: 0.1 }, 
                opacity: { ease: "easeOut", duration: 0.3 }
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
            transition: {
                x: { ease: "linear", duration: 0.1 }, 
                bottom: { ease: "linear", duration: 0.1 }, 
                opacity: { ease: "easeOut", duration: 0.3 }
            },
        },
    };

    return imageUrl ? (
        <motion.div
            key={`speaker_motion_div_${speaker.anonymizedId}`}
            variants={variants}
            initial='absent'
            exit='absent'
            animate={isTalking ? 'talking' : 'idle'}
            style={{position: 'absolute', width: 'auto', aspectRatio: '9 / 16', zIndex: 10, overflow: 'visible'}}>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', filter: 'blur(2.5px)', transform: 'translate(-50%, 0)', zIndex: 4}} alt={`${speaker.name} (${emotion})`}/>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', opacity: 0.75, transform: 'translate(-50%, 0)', zIndex: 5}} alt={`${speaker.name} (${emotion})`}/>
        </motion.div>) : <></>
};

export default SpeakerImage;