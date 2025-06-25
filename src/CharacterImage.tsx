import {motion, Variants} from "framer-motion";
import { Emotion } from "./Expressions";
import { Character } from "@chub-ai/stages-ts";
import { FC } from "react";

const IDLE_HEIGHT: number = 60;
const SPEAKING_HEIGHT: number = 80;

interface CharacterImageProps {
    character: Character;
    emotion: Emotion;
    imageUrl: string;
    xPosition: number;
    isTalking: boolean;
}

const CharacterImage: FC<CharacterImageProps> = ({character, emotion, imageUrl, xPosition, isTalking}) => {
    const variants: Variants = {
        absent: {color: '#BBBBBB', opacity: 0, x: `150vw`, bottom: `12vh`, height: `${IDLE_HEIGHT}vh`, filter: 'brightness(0.8)', zIndex: 10, transition: {x: {ease: "easeOut"}, bottom: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
        talking: {color: '#FFFFFF', opacity: 1, x: `50vw`, bottom: `5vh`, height: `${SPEAKING_HEIGHT}vh`, filter: 'brightness(1)', zIndex: 12, transition: {x: {ease: "easeOut"}, bottom: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
        idle: {color: '#BBBBBB', opacity: 1, x: `${xPosition}vw`, bottom: `12vh`, height: `${IDLE_HEIGHT}vh`, filter: 'brightness(0.8)', zIndex: 11, transition: {x: {ease: "easeOut"}, bottom: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
    };

    return (
        <motion.div
            key={character.anonymizedId}
            variants={variants}
            initial='absent'
            animate={isTalking ? 'talking' : 'idle'}
            style={{position: 'absolute', width: 'auto', aspectRatio: '9 / 16', zIndex: 10, overflow: 'visible'}}>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', filter: 'blur(2.5px)', pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 4}} alt={`${character.name} (${emotion})`}/>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', opacity: 0.75, pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 5}} alt={`${character.name} (${emotion})`}/>
        </motion.div>
    );
};

export default CharacterImage;