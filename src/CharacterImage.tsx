import {motion, Variants} from "framer-motion";
import { Emotion } from "./Expressions";
import { Character } from "@chub-ai/stages-ts";
import { FC } from "react";

const CHARACTER_HEIGHT: number = 80;
const FRAME_RADIUS = "5vw"; // Match BackgroundImage borderRadius
const FRAME_WIDTH = "80vw"; // Match BackgroundImage width
const FRAME_HEIGHT = "80vh"; // Match BackgroundImage height

interface CharacterImageProps {
    character: Character;
    emotion: Emotion;
    imageUrl: string;
    xPosition: number;
    isTalking: boolean;
    clipBackground: boolean;
}

const CharacterImage: FC<CharacterImageProps> = ({character, emotion, imageUrl, xPosition, isTalking, clipBackground}) => {
   const variants: Variants = {
        talking: {
            color: '#FFFFFF',
            opacity: 1,
            x: `${xPosition}vw`,
            height: `${CHARACTER_HEIGHT + 2}vh`,
            filter: 'brightness(1)',
            zIndex: 12,
            transition: {x: {ease: "easeOut"}, opacity: {ease: "easeOut"}},
        },
        idle: {
            color: '#BBBBBB',
            opacity: 1,
            x: `${xPosition}vw`,
            height: `${CHARACTER_HEIGHT}vh`,
            filter: 'brightness(0.8)',
            zIndex: 11,
            transition: {x: {ease: "easeOut"}, opacity: {ease: "easeOut"}},
        },
    };

    // Only apply the mask if not talking and there is a background
    const maskStyle = (!isTalking && clipBackground)
        ? {
            clipPath: `inset(0 round ${FRAME_RADIUS})`,
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
        }
        : {};

    return (
        <motion.div
            key={character.anonymizedId}
            variants={variants}
            initial='idle'
            animate={isTalking ? 'talking' : 'idle'}
            style={{
                position: 'absolute',
                bottom: '5vh',
                width: 'auto',
                aspectRatio: '9 / 16',
                zIndex: 10,
                overflow: 'visible',
                ...maskStyle,
            }}>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', filter: 'blur(2.5px)', pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 4}} alt={`${character.name} (${emotion})`}/>
            <img src={imageUrl} style={{position: 'absolute', top: 0, width: '100%', height: '100%', opacity: 0.75, pointerEvents: 'none', transform: 'translate(-50%, 0)', zIndex: 5}} alt={`${character.name} (${emotion})`}/>
        </motion.div>
    );
};

export default CharacterImage;