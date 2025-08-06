import { AnimatePresence, motion } from "framer-motion";
import { FC, useState, useEffect, useMemo } from "react";
import { DEFAULT_BORDER_COLOR, Expressions } from "./Expressions";
import SpeakerImage from "./SpeakerImage";
import DepthPlane from "./DepthPlane";
import { Canvas } from "@react-three/fiber";

interface SceneProps {
    imageUrl: string;
    depthUrl: string;
    stage: Expressions;
}

const FRAME_START_LEFT = "100vw";
const FRAME_END_LEFT = "6vw";

const Scene: FC<SceneProps> = ({ imageUrl, depthUrl, stage }) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isMouseOver, setIsMouseOver] = useState(false);

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

        // Add event listeners to the entire document for mouse movement
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Gradually recenter mouse coordinates when mouse is not over the component
    useEffect(() => {
        if (!isMouseOver) {
            const interval = setInterval(() => {
                setMousePosition(prev => ({
                    x: prev.x * 0.95, // Gradually move towards 0
                    y: prev.y * 0.95
                }));
            }, 16); // ~60fps

            return () => clearInterval(interval);
        }
    }, [isMouseOver]);

    // Calculate pan and parallax values
    const { panX, panY, parallaxX, parallaxY } = useMemo(() => {
        const canvasAspect = window.innerWidth / window.innerHeight;
        const imageAspect = 9 / 16; // Assuming standard aspect ratio, adjust if needed
        
        // Determine if we can pan in each axis
        const canPanX = imageAspect > canvasAspect;
        const canPanY = imageAspect <= canvasAspect;
        
        // Calculate panning offset
        const panStrength = 0.3;
        const panX = (stage.alphaMode && imageUrl && canPanX) ? mousePosition.x * panStrength : 0;
        const panY = (stage.alphaMode && imageUrl && canPanY) ? mousePosition.y * panStrength : 0;

        // Calculate parallax offset (for depth effects)
        const parallaxStrength = 0.03;
        const parallaxX = (stage.alphaMode && imageUrl) ? mousePosition.x * parallaxStrength : 0;
        const parallaxY = (stage.alphaMode && imageUrl) ? mousePosition.y * parallaxStrength : 0;

        return { panX, panY, parallaxX, parallaxY };
    }, [mousePosition]);

    const borderColor = stage.messageState.borderColor ?? DEFAULT_BORDER_COLOR;

    const speakerCount = Object.values(stage.speakers).filter(speaker => stage.isSpeakerDisplayed(speaker)).length;
    let speakerIndex = 0;

    return (
        <div 
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "auto"
            }}
            onMouseEnter={() => setIsMouseOver(true)}
            onMouseLeave={() => setIsMouseOver(false)}
        >
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
                                    <Canvas
                                        style={{
                                            position: 'absolute',
                                            left: '0',
                                            bottom: '8vh',
                                            width: '100vw',
                                            height: '90vh',
                                            zIndex: 1,
                                            pointerEvents: 'none', // Allow events to pass through to elements below
                                        }}
                                        camera={{ position: [0, 0, 3], fov: 50 }}
                                    >
                                        <DepthPlane
                                            imageUrl={imageUrl}
                                            depthUrl={depthUrl}
                                            panX={panX}
                                            panY={panY}
                                            parallaxX={parallaxX}
                                            parallaxY={parallaxY}
                                        />
                                    </Canvas>
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
                <div style={{position: "absolute", top: 0, height: "100vh", width: "100vw", zIndex: 2}}>
                    {Object.values(stage.speakers).map(character => {
                        if (stage.isSpeakerDisplayed(character)) {
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
                                panX={panX}
                                panY={panY}
                                parallaxX={parallaxX}
                                parallaxY={parallaxY}
                            />
                        } else {
                            return <></>
                        }
                    })}
                </div>
            </AnimatePresence>
        </div>
    );
};

export default Scene;