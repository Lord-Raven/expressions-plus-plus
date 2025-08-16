import { AnimatePresence, motion } from "framer-motion";
import { FC, useState, useEffect, useMemo, useRef } from "react";
import { Expressions } from "./Expressions";
import SpeakerImage from "./SpeakerImage";
import DepthPlane from "./DepthPlane";
import { Canvas } from "@react-three/fiber";
import { DEFAULT_BORDER_COLOR, DEFAULT_HIGHLIGHT_COLOR } from "./Background";

interface SceneProps {
    imageUrl: string;
    depthUrl: string;
    stage: Expressions;
}

const FRAME_START_LEFT = "100vw";
const FRAME_END_LEFT = "6vw";

const Scene: FC<SceneProps> = ({ imageUrl, depthUrl, stage }) => {
    const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
    const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
    const [isMouseOver, setIsMouseOver] = useState(false);
    const animationFrameRef = useRef<number>(0);
    const targetPositionRef = useRef({ x: 0, y: 0 });
    const isMouseOverRef = useRef(false);

    // Update refs when state changes
    useEffect(() => {
        targetPositionRef.current = targetPosition;
    }, [targetPosition]);

    useEffect(() => {
        isMouseOverRef.current = isMouseOver;
    }, [isMouseOver]);

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
            setTargetPosition({ x, y });
        };

        // Add event listeners to the entire document for mouse movement
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Smoothly interpolate current position toward target position
    useEffect(() => {
        const animate = () => {
            setCurrentPosition(prev => {
                const target = targetPositionRef.current;
                const deltaX = target.x - prev.x;
                const deltaY = target.y - prev.y;
                
                // If mouse is not over the component, gradually move toward center (0, 0)
                if (!isMouseOverRef.current) {
                    return {
                        x: prev.x * 0.95,
                        y: prev.y * 0.95
                    };
                }

                const lerpFactor = 0.3;
                
                return {
                    x: prev.x + deltaX * lerpFactor,
                    y: prev.y + deltaY * lerpFactor
                };
            });
            
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []); // Empty dependency array - this effect runs once and manages its own lifecycle

    // Calculate pan values
    const { panX, panY } = useMemo(() => {
        
    // Calculate panning offset with quadratic decay
    const panStrength = 0.05;
    // Distance from center (0,0)
    const distance = Math.sqrt(currentPosition.x * currentPosition.x + currentPosition.y * currentPosition.y);
    // Quadratic decay: scale = distance^2 (normalized to max 1)
    const maxDistance = Math.sqrt(1 * 1 + 1 * 1); // max possible distance in normalized coords
    const scale = Math.pow(distance / maxDistance, 2); // quadratic decay
    // Alternatively, for exponential decay: const scale = 1 - Math.exp(-distance * 3);
    const panX = (stage.alphaMode && imageUrl) ? -currentPosition.x * panStrength * scale : 0;
    const panY = (stage.alphaMode && imageUrl) ? currentPosition.y * panStrength * scale : 0;

    return { panX, panY };
    }, [currentPosition]);

    const borderColor = stage.getSelectedBackground().borderColor ?? DEFAULT_BORDER_COLOR;
    const highlightColor = stage.getSelectedBackground().highlightColor ?? DEFAULT_HIGHLIGHT_COLOR;

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
                                bottom: "13vh",
                                width: "88vw",
                                height: "85vh",
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
                                    bottom: " -13vh",
                                    width: "100vw",
                                    height: "100vh",
                                }}
                            >
                                {stage.alphaMode ? (
                                    <Canvas
                                        style={{
                                            position: 'absolute',
                                            left: '0',
                                            bottom: '13vh',
                                            width: '100vw',
                                            height: '85vh',
                                            zIndex: 1,
                                            pointerEvents: 'none', // Allow events to pass through to elements below
                                        }}
                                        camera={{ position: [0, 0, 3], fov: 90 }}
                                    >
                                        <DepthPlane
                                            imageUrl={imageUrl}
                                            depthUrl={depthUrl}
                                            panX={panX}
                                            panY={panY}
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
                                            bottom: "13vh",
                                            width: "100vw",
                                            height: "85vh",
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
            </AnimatePresence>
            <div style={{position: "absolute", top: 0, height: "100vh", width: "100vw", zIndex: 2}}>
                <AnimatePresence>
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
                                highlightColor={highlightColor}
                                alphaMode={stage.alphaMode}
                                panX={panX}
                                panY={panY}
                            />
                        } else {
                            return <></>
                        }
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Scene;