import {motion, Variants} from "framer-motion";
import { Emotion } from "./Expressions";
import { Character } from "@chub-ai/stages-ts";
import { FC } from "react";

const CHARACTER_HEIGHT: number = 80;

interface CharacterImageProps {
    character: Character;
    emotion: Emotion;
    imageUrl: string;
    xPosition: number;
    isTalking: boolean;
}

const CharacterImage: FC<CharacterImageProps> = ({character, emotion, imageUrl, xPosition, isTalking}) => {
    const variants: Variants = {
        talking: {color: '#FFFFFF', opacity: 1, x: `${xPosition}vw`, height: `${CHARACTER_HEIGHT + 2}vh`, filter: 'brightness(1)', zIndex: 12, transition: {x: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
        idle: {color: '#BBBBBB', opacity: 1, x: `${xPosition}vw`, height: `${CHARACTER_HEIGHT}vh`, filter: 'brightness(0.8)', zIndex: 11, transition: {x: {ease: "easeOut"}, opacity: {ease: "easeOut"}}},
    };

    return (
        <motion.div
            key={character.anonymizedId}
            variants={variants}
            initial='idle'
            animate={isTalking ? 'talking' : 'idle'}
            style={{position: 'absolute', bottom: '5vh', width: 'auto', aspectRatio: '9 / 16', zIndex: 10, overflow: 'visible'}}>
            <img src={imageUrl} style={{position: 'absolute', top: 0, left: '50%', width: '100%', height: '100%', filter: 'blur(1.5px)', opacity: 0.7, pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 0}} alt={`${character.name} (${emotion})`}/>
            <img src={imageUrl} style={{position: 'absolute', top: 0, left: '50%', width: '100%', height: '100%', pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 1}} alt={`${character.name} (${emotion})`}/>
        </motion.div>
    );
};

export default CharacterImage;