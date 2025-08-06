import { AnimatePresence, motion } from "framer-motion";
import { FC } from "react";
import DepthScene from "./DepthPlane";
import { DEFAULT_BORDER_COLOR, Expressions } from "./Expressions";
import SpeakerImage from "./SpeakerImage";

interface SceneProps {
    imageUrl: string;
    depthUrl: string;
    stage: Expressions;
}

const FRAME_START_LEFT = "100vw";
const FRAME_END_LEFT = "6vw";

const Scene: FC<SceneProps> = ({ imageUrl, depthUrl, stage }) => {

    const borderColor = stage.messageState.borderColor ?? DEFAULT_BORDER_COLOR;

    const speakerCount = Object.values(stage.speakers).filter(speaker => stage.isSpeakerDisplayed(speaker)).length;
    let speakerIndex = 0;
    return (
        <AnimatePresence>
            {imageUrl && (
                <>
                    <motion.div
                        key="background-blur"
                        initial={{ left: FRAME_START_LEFT, opacity: 0 }}
                        animate={{ left: FRAME_END_LEFT, opacity: 1 }}
                        exit={{ left: FRAME_START_LEFT, opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        style={{
                            width: "100%",
                            height: "100%",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            maskImage: "radial-gradient(closest-side at 50% 50%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)",
                            WebkitMaskImage: "radial-gradient(closest-side at 50% 50%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)",
                            maskSize: "100% 100%",
                            WebkitMaskSize: "100% 100%",
                            maskRepeat: "no-repeat",
                            WebkitMaskRepeat: "no-repeat",
                            zIndex: 1,
                            pointerEvents: "none"
                        }}
                    />
                    <motion.div
                        key="background-frame"
                        initial={{ left: FRAME_START_LEFT, opacity: 0 }}
                        animate={{ left: FRAME_END_LEFT, opacity: 1 }}
                        exit={{ left: FRAME_START_LEFT, opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        style={{
                            position: "absolute",
                            bottom: "8vh",
                            width: "88vw",
                            height: "90vh",
                            borderRadius: "5vw",
                            overflow: "hidden",
                            zIndex: 2,
                            boxShadow: "5px 5px 40px 6px rgba(0, 0, 0, 0.37)",
                            border: `3px solid ${borderColor}`,
                            pointerEvents: "none"
                        }}
                    >
                        <motion.div
                            key="background-frame-offset"
                            initial={{ left: `-${FRAME_START_LEFT}`, opacity: 1 }}
                            animate={{ left: `-${FRAME_END_LEFT}`, opacity: 1 }}
                            exit={{ left: `-${FRAME_START_LEFT}`, opacity: 1 }}
                            transition={{ duration: 0.7 }}
                            style={{
                                position: "absolute",
                                bottom: " -8vh",
                                width: "100vw",
                                height: "100vh",
                            }}
                        >
                            {depthUrl ? (
                                <DepthScene
                                    imageUrl={imageUrl}
                                    depthUrl={depthUrl}
                                />
                            ) : (
                                <img
                                    src={imageUrl}
                                    alt="Background"
                                    crossOrigin="anonymous"
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        bottom: "8vh",
                                        width: "100vw",
                                        height: "90vh",
                                        objectFit: "cover",
                                        objectPosition: "center bottom",
                                        filter: "blur(1px)",
                                        zIndex: 1,
                                    }}
                                />
                            )}
                        </motion.div>
                    </motion.div>
                </>
            )}
            <div style={{position: "relative", height: "100vh", width: "100vw", zIndex: 2}}>
                {Object.values(stage.speakers).map(character => {
                    console.log(`Rendering speaker: ${character.anonymizedId}, displayed: ${stage.isSpeakerDisplayed(character)}`);
                    if (stage.isSpeakerDisplayed(character)) {
                        console.log(`Speaker ${character.anonymizedId} is displayed, index: ${speakerIndex}`);
                        speakerIndex++;
                        let xPosition = speakerCount == 1 ? 50 :
                            ((speakerIndex % 2 == 1) ?
                                (Math.ceil(speakerIndex / 2) * (50 / (Math.ceil(speakerCount / 2) + 1))) :
                                (Math.floor(speakerIndex / 2) * (50 / (Math.floor(speakerCount / 2) + 1)) + 50));
                        // Farther from 50, higher up on the screen:
                        let yPosition = Math.ceil(Math.abs(xPosition - 50) / 5);
                        // Closer to 50, higher visual priority:
                        const zIndex = Math.ceil((50 - Math.abs(xPosition - 50)) / 5);

                        return <SpeakerImage
                            key={`character_${character.anonymizedId}`}
                            speaker={character}
                            emotion={stage.getSpeakerEmotion(character.anonymizedId)}
                            xPosition={xPosition}
                            yPosition={yPosition}
                            zIndex={zIndex}
                            imageUrl={stage.getSpeakerImage(character.anonymizedId, stage.chatState.selectedOutfit[character.anonymizedId], stage.getSpeakerEmotion(character.anonymizedId), '')}
                            isTalking={stage.messageState.activeSpeaker == character.anonymizedId}
                            alphaMode={stage.alphaMode}
                        />
                    } else {
                        return <></>
                    }
                })}
            </div>
        </AnimatePresence>
    );
};

export default Scene;