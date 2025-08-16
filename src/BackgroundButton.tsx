import React, {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Typography, IconButton, ButtonBase, Box} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import LandscapeIcon from '@mui/icons-material/Landscape';
import AddIcon from '@mui/icons-material/Add';
import { Background } from "./Background";

type BackgroundButtonProps = {
    stage: any;
    borderColor: string;
    onOpenSettings: (background: Background) => void;
};

const BackgroundButton: React.FC<BackgroundButtonProps> = ({stage, borderColor, onOpenSettings}) => {
    const [showBackgrounds, setShowBackgrounds] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const selectedBackground = stage.getSelectedBackground();
    const backgrounds: {[key: string]: Background} = stage.backgrounds;

    const handleCreateNewBackground = () => {
        const newBackground = stage.createNewBackground();
        stage.backgrounds[newBackground.id] = newBackground;
        stage.wrapPromise(stage.generateBackgroundImage(newBackground, Object.values(stage.speakers)[0], ''), `Generating background for ${newBackground.name}.`).then(() => {stage.setSelectedBackground(newBackground.id)});
    };

    const containerVariants = {
        collapsed: { width: 40 },
        expanded: { width: 'auto' },
    };

    const iconVariants = {
        collapsed: { opacity: 0, x: 10, overflow: "hidden", pointerEvents: "none" },
        expanded: { opacity: 1, x: 0, pointerEvents: "auto" },
    };

    const getBackgroundPreview = (background: Background): string => {
        if (background.backgroundUrl) {
            return background.backgroundUrl;
        }
        // Return a default background color or pattern
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" fill="${background.borderColor || '#333'}"/>
                <text x="20" y="25" text-anchor="middle" fill="white" font-size="12">BG</text>
            </svg>
        `)}`;
    };

    return (
        <motion.div
            variants={containerVariants}
            animate={isExpanded ? "expanded" : "collapsed"}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => {setIsExpanded(false); setShowBackgrounds(false);}}
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
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
                        backgroundImage: selectedBackground ? `url(${getBackgroundPreview(selectedBackground)})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: selectedBackground ? undefined : "#555",
                        pointerEvents: "none"
                    }}
                    onClick={() => {setIsExpanded(prev => !prev)}}
                >
                    {!selectedBackground && <LandscapeIcon fontSize="small" sx={{color: "white"}}/>}
                </IconButton>
                <motion.div
                    style={{display: "flex", gap: 4}}
                    variants={iconVariants}
                    transition={{duration: 0.3}}
                >
                    <Typography color="text.primary" sx={{marginTop: "4px", fontWeight: 600, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        {selectedBackground?.name || 'No Background'}
                    </Typography>
                    {selectedBackground && (
                        <IconButton size="small" onClick={() => onOpenSettings(selectedBackground)}>
                            <SettingsIcon fontSize="small"/>
                        </IconButton>
                    )}
                    <IconButton size="small" onClick={() => setShowBackgrounds(prev => !prev)}>
                        <LandscapeIcon fontSize="small"/>
                    </IconButton>
                    <IconButton size="small" onClick={handleCreateNewBackground}>
                        <AddIcon fontSize="small"/>
                    </IconButton>
                </motion.div>
            </div>

            {/* Background List Row (separate line below capsule) */}
            <AnimatePresence>
                {showBackgrounds && (
                    <motion.div
                        key="backgrounds"
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: "auto"}}
                        exit={{opacity: 0, height: 0}}
                        transition={{duration: 0.3}}
                        style={{overflow: "hidden"}}
                    >
                        <motion.div style={{display: "flex", flexDirection: "column", gap: 6, width: "100%"}}>
                            {Object.values(backgrounds).map((background) => (
                                <ButtonBase
                                    key={`background_option_${background.id}`}
                                    onClick={() => {
                                        stage.setSelectedBackground(background.id);
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
                                        backgroundColor: background.id === stage.chatState.selectedBackground ? 
                                            "rgba(255,255,255,0.15)" : "transparent",
                                        "&:hover": {
                                            backgroundColor: "rgba(255,255,255,0.08)",
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 4,
                                            backgroundImage: `url(${getBackgroundPreview(background)})`,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            flexShrink: 0,
                                            border: "1px solid rgba(255,255,255,0.2)"
                                        }}
                                    />
                                    <Typography color="text.primary" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                                        {background.name}
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

export default BackgroundButton;
