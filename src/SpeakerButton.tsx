import React, {useState} from "react";
import {DEFAULT_OUTFIT_NAME, Emotion} from "./Expressions";
import { Speaker } from "@chub-ai/stages-ts";
import {AnimatePresence, motion} from "framer-motion";
import {Typography, IconButton, ButtonBase, Box} from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import silhouetteUrl from './assets/silhouette.png'


type SpeakerButtonProps = {
    speaker: Speaker;
    stage: any;
    borderColor: string;
    onOpenSettings: (speaker: Speaker) => void;
};

const SpeakerButton: React.FC<SpeakerButtonProps> = ({speaker, stage, borderColor, onOpenSettings}) => {
    const [showOutfits, setShowOutfits] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggleVisibility = () => {
        const id = speaker.anonymizedId;
        const prev = stage.isSpeakerVisible(speaker);
        stage.chatState.speakerVisible[id] = !prev;
        stage.updateChatState();
    };

    const containerVariants = {
        collapsed: { width: 40 },
        expanded: { width: 'auto' },
    };

    const iconVariants = {
        collapsed: { opacity: 0, x: 10, overflow: "hidden", pointerEvents: "none" },
        expanded: { opacity: 1, x: 0, pointerEvents: "auto" },
    };

    return (
        <motion.div
            variants={containerVariants}
            animate={isExpanded ? "expanded" : "collapsed"}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => {setIsExpanded(false); setShowOutfits(false);}}
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",  // stack vertically
                overflow: "hidden",
                borderRadius: 23,
                backgroundColor: "#333",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                border: `3px solid ${borderColor}`,
                cursor: "pointer",
                right: 20,
                zIndex: 1000,
            }}
            transition={{type: "spring", stiffness: 300, damping: 30}}
        >
            {/* Top Capsule Row */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    width: "100%"
                }}
            >
                <IconButton
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundImage: `url(${stage.getSpeakerImage(speaker.anonymizedId, stage.chatState.selectedOutfit[speaker.anonymizedId] ?? DEFAULT_OUTFIT_NAME, Emotion.neutral, silhouetteUrl)})`,
                        backgroundSize: "200% 356%",
                        backgroundPosition: "center top",
                        pointerEvents: "none"
                    }}
                    onClick={() => {setIsExpanded(prev => !prev)}}
                >
                    {!stage.isSpeakerVisible(speaker) && (<VisibilityOffIcon fontSize="small" sx={{backgroundColor: "#00000033"}}/>)}
                </IconButton>
                <motion.div
                    style={{display: "flex", gap: 4}}
                    variants={iconVariants}
                    transition={{duration: 0.3}}
                >
                    <Typography color="text.primary" sx={{marginTop: "4px", fontWeight: 600, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        {speaker.name}
                    </Typography>
                    <IconButton size="small" onClick={() => onOpenSettings(speaker)}>
                        <SettingsIcon fontSize="small"/>
                    </IconButton>
                    <IconButton size="small" onClick={() => setShowOutfits(prev => !prev)}>
                        <CheckroomIcon fontSize="small"/>
                    </IconButton>
                    <IconButton size="small" onClick={handleToggleVisibility}>
                        {stage.isSpeakerVisible(speaker) ? (
                            <VisibilityIcon fontSize="small" />
                        ) : (
                            <VisibilityOffIcon fontSize="small" />
                        )}
                    </IconButton>
                </motion.div>
            </div>

            {/* Outfit List Row (separate line below capsule) */}
            <AnimatePresence>
                {showOutfits && (
                    <motion.div
                        key="outfits"
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: "auto"}}
                        exit={{opacity: 0, height: 0}}
                        transition={{duration: 0.3}}
                        style={{overflow: "hidden"}}
                    >
                        <motion.div style={{display: "flex", flexDirection: "column", gap: 6, width: "100%"}}>
                            {(Object.keys(stage.alphaMode ? stage.wardrobes[speaker.anonymizedId].outfits : stage.chatState.generatedWardrobes[speaker.anonymizedId])).map((outfit) => (
                                <ButtonBase
                                    key={`outfit_option_${outfit}`}
                                    onClick={() => {
                                        stage.chatState.selectedOutfit[speaker.anonymizedId] = outfit;
                                        stage.updateChatState();
                                    }}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "flex-start",
                                        gap: 1.5,
                                        width: "100%",
                                        padding: "6px 12px",
                                        borderRadius: 8,
                                        transition: "background-color 0.2s ease",
                                        textAlign: "left",
                                        "&:hover": {
                                            backgroundColor: "rgba(255,255,255,0.08)",
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            backgroundImage: `url(${stage.getSpeakerImage(speaker.anonymizedId, outfit, Emotion.neutral, silhouetteUrl)})`,
                                            backgroundSize: "200% 356%",
                                            backgroundPosition: "center top",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Typography color="text.primary" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                                        {stage.alphaMode ? stage.wardrobes[speaker.anonymizedId].outfits[outfit].name : outfit}
                                    </Typography>
                                </ButtonBase>
                            ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SpeakerButton;