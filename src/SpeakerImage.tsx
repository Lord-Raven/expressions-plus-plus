import {motion, Variants} from "framer-motion";
import { Emotion } from "./Expressions";
import { Speaker } from "@chub-ai/stages-ts";
import { FC } from "react";

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
}

const SpeakerImage: FC<SpeakerImageProps> = ({speaker, emotion, imageUrl, xPosition, yPosition, zIndex, isTalking}) => {
    const variants: Variants = {
        absent: {color: '#BBBBBB', opacity: 0, x: `150vw`, bottom: `${4 + yPosition}vh`, height: `${IDLE_HEIGHT - yPosition * 2}vh`, filter: 'brightness(0.8)', zIndex: zIndex, transition: {x: {ease: "easeOut"}, bottom: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
        talking: {color: '#FFFFFF', opacity: 1, x: `50vw`, bottom: `2vh`, height: `${SPEAKING_HEIGHT}vh`, filter: 'brightness(1)', zIndex: 100, transition: {x: {ease: "easeOut"}, bottom: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
        idle: {color: '#BBBBBB', opacity: 1, x: `${xPosition}vw`, bottom: `${4 + yPosition}vh`, height: `${IDLE_HEIGHT - yPosition * 2}vh`, filter: 'brightness(0.8)', zIndex: zIndex, transition: {x: {ease: "easeOut"}, bottom: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
    };

    return imageUrl ? (
        <motion.div
            key={`speaker_motion_div_${speaker.anonymizedId}`}
            variants={variants}
            initial='absent'
            exit='absent'
            animate={isTalking ? 'talking' : 'idle'}
            style={{position: 'absolute', width: 'auto', aspectRatio: '9 / 16', zIndex: 10, overflow: 'visible'}}>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', filter: 'blur(2.5px)', pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 4}} alt={`${speaker.name} (${emotion})`}/>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', opacity: 0.75, pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 5}} alt={`${speaker.name} (${emotion})`}/>
        </motion.div>) : <></>
};

export default SpeakerImage;