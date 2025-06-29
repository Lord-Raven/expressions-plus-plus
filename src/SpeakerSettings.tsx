import React, {useState, useRef, useEffect} from "react";
import {DEFAULT_OUTFIT_NAME, Emotion, EMOTION_PROMPTS} from "./Expressions";
import { Speaker } from "@chub-ai/stages-ts";
import {motion} from "framer-motion";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, Typography, TextField, IconButton
} from "@mui/material";
import { Grid, Tabs, Tab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import silhouetteUrl from './assets/silhouette.png'

export interface SpeakerSettingsHandle {
    setSpeaker: (speaker: Speaker|null) => void;
}

type SpeakerSettingsProps = {
    register?: (handle: SpeakerSettingsHandle) => void;
    stage: any;
    borderColor: string;
    onRegenerate?: (speaker: Speaker, outfit: string, emotion: Emotion) => void;
};

const SpeakerSettings: React.FC<SpeakerSettingsProps> = ({register, stage, borderColor, onRegenerate}) => {
    const [speaker, setSpeaker] = useState<Speaker|null>(null);
    const [selectedOutfit, setSelectedOutfit] = useState<string>(DEFAULT_OUTFIT_NAME);
    const [confirmEmotion, setConfirmEmotion] = useState<Emotion | null>(null);
    const [outfitMap, setOutfitMap] = useState<{[key: string]: any}>({[DEFAULT_OUTFIT_NAME]: {}});
    const [outfitNames, setOutfitNames] = useState<string[]>([DEFAULT_OUTFIT_NAME]);
    const NEW_OUTFIT_NAME = 'Unnamed Outfit';

    useEffect(() => {
        setSelectedOutfit((speaker ? stage.chatState.selectedOutfit[speaker.anonymizedId] : null) ?? DEFAULT_OUTFIT_NAME);
        setOutfitMap((speaker ? stage.chatState.generatedWardrobes[speaker.anonymizedId] : {}) ?? {[DEFAULT_OUTFIT_NAME]: {}});
        setOutfitNames(Object.keys(speaker ? stage.chatState.generatedWardrobes[speaker.anonymizedId] : {[DEFAULT_OUTFIT_NAME]: {}}) ?? {[DEFAULT_OUTFIT_NAME]: {}});
    }, [speaker]);

    useEffect(() => {
        register?.({ setSpeaker });
        return () => register?.(undefined!);
    }, [register]);

    const updateStageWardrobeMap = (newMap: {[key: string]: any}) => {
        if (speaker) {
            stage.chatState.generatedWardrobes[speaker.anonymizedId] = newMap;
            setOutfitMap(newMap);
            setOutfitNames(Object.keys(newMap));
            if (!(stage.chatState.selectedOutfit[speaker.anonymizedId] in stage.chatState.generatedWardrobes[speaker.anonymizedId])) {
                stage.chatState.selectedOutfit[speaker.anonymizedId] = DEFAULT_OUTFIT_NAME
            }
            stage.updateChatState();
        }
    }

    const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const handleNewTabRef = (name: string) => (el: HTMLDivElement | null) => {
        tabRefs.current[name] = el;
        if (selectedOutfit === name && el) {
            el.scrollIntoView({ behavior: "smooth", inline: "end" });
        }
    };

    const EditableTabLabel = ({
                                  name,
                                  onRename,
                                  onDelete
                              }: {
        name: string;
        onRename: (newName: string) => void;
        onDelete: () => void;
    }) => {
        const [editing, setEditing] = useState(false);
        const [value, setValue] = useState(name);

        if (name === DEFAULT_OUTFIT_NAME) return <span>{name}</span>;

        return editing ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
                <TextField
                    value={value}
                    size="small"
                    onBlur={() => {
                        onRename(value.trim());
                        setEditing(false);
                    }}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            onRename(value.trim());
                            setEditing(false);
                        }
                    }}
                    sx={{ width: 100 }}
                />
                <IconButton
                    size="small"
                    onClick={onDelete}
                    sx={{ ml: 0.5 }}
                    aria-label="Delete outfit"
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>
        ) : (
            <span onDoubleClick={() => setEditing(true)}>{name}</span>
        );
    };

    const handleOutfitRename = (oldName: string, newName: string) => {
        if (newName === DEFAULT_OUTFIT_NAME || outfitMap[newName] || newName.trim() == '') return; // reject reserved or duplicate
        const updatedMap = { ...outfitMap };
        updatedMap[newName] = updatedMap[oldName];
        delete updatedMap[oldName];

        if (selectedOutfit === oldName) setSelectedOutfit(newName);
        updateStageWardrobeMap(updatedMap);
    };

    const handleOutfitDelete = (name: string) => {
        if (name === DEFAULT_OUTFIT_NAME) return;

        const {[name]: removed, ...rest} = outfitMap;

        if (selectedOutfit === name) {
            const fallback = Object.keys(rest)[0] ?? DEFAULT_OUTFIT_NAME;
            setSelectedOutfit(fallback);
        }
        updateStageWardrobeMap(rest);
    };

    return (<>
        {speaker && (<div>
            <Dialog open={true} onClose={() => setSpeaker(null)}>
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6" component="div">
                        <b>{speaker.name} Management</b>
                    </Typography>
                    <IconButton
                        onClick={() => setSpeaker(null)}
                        aria-label={"Close"}
                        size={"small"}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{mb: 2}}>
                        For each outfit, a physical description and neutral image are generated and all other emotions are created from the neutral base image. Rename or remove additional outfits by double-clicking their tabs; an outfit's name will help steer its generation.
                    </Typography>
                    <Tabs
                        value={selectedOutfit || outfitNames[0]}
                        variant="scrollable"
                        scrollButtons="auto"
                        onChange={(_, newValue) => {
                            if (newValue === "__add_new__") {
                                const newName = NEW_OUTFIT_NAME;
                                updateStageWardrobeMap({...outfitMap, [newName]: {}});
                                setSelectedOutfit(newName);

                            } else {
                                setSelectedOutfit(newValue);
                            }
                        }}
                    >
                        {outfitNames.map((name) => (
                            <Tab
                                key={`outfit_tab_${name}`}
                                label={<EditableTabLabel
                                    name={name}
                                    onRename={(newName) => handleOutfitRename(name, newName)}
                                    onDelete={() => handleOutfitDelete(name)}
                                />}
                                value={name}
                                ref={handleNewTabRef(name)}
                            />
                        ))}
                        {outfitNames.length < 6 && !outfitNames.includes(NEW_OUTFIT_NAME) && (
                            <Tab
                                icon={<AddIcon />}
                                key={`new_outfit_tab`}
                                value="__add_new__"
                                sx={{ minWidth: 50, pl: 1, pr: 1 }}
                            />
                        )}
                    </Tabs>
                    <Grid container spacing={1} justifyContent="center" sx={{mt: 2}}>
                        {Object.keys(EMOTION_PROMPTS).map((emotion, index) => {
                            const image = stage.getSpeakerImage(
                                speaker.anonymizedId,
                                selectedOutfit ?? DEFAULT_OUTFIT_NAME,
                                emotion as Emotion,
                                silhouetteUrl
                            );

                            return (
                                <Grid key={emotion} component={motion.div}
                                      initial={{opacity: 0, x: 50}}
                                      whileHover={{scale: 1.1, zIndex: 2000}}
                                      animate={{opacity: 1, x: 0}}
                                      transition={{duration: 0.3, delay: index * 0.05}}>
                                    <Button
                                        variant="outlined"
                                        sx={{
                                            width: 120, height: 120,
                                            p: 0,
                                            display: "flex",
                                            alignItems: "flex-end",
                                            justifyContent: "center",
                                            borderRadius: 2,
                                            backgroundImage: `url(${image})`,
                                            backgroundPosition: "center top",
                                            backgroundSize: "200% 356%",
                                            color: (emotion != Emotion.neutral && image == stage.getSpeakerImage(speaker.anonymizedId, selectedOutfit, Emotion.neutral)) ? "#666" : "#222",
                                            fontWeight: 600,
                                            textShadow: "0 1px 2px #fff",
                                            border: "2px solid #888",
                                        }}
                                        onClick={() => setConfirmEmotion(emotion as Emotion)}
                                    >
                                      <span style={{
                                          background: "rgba(255,255,255,0.7)",
                                          borderRadius: 4,
                                          padding: "2px 2px",
                                          fontSize: 12,
                                          width: "100%",
                                          textAlign: "center"
                                      }}>
                                        {emotion}
                                      </span>
                                    </Button>
                                </Grid>
                            );
                        })}
                    </Grid>
                </DialogContent>
            </Dialog>
            {/* Confirmation dialog */}
            <Dialog
                open={!!confirmEmotion}
                onClose={() => setConfirmEmotion(null)}
            >
                <DialogTitle>
                    Confirm Regeneration
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Generate <b>{confirmEmotion}</b> image for <b>{speaker.name}</b>?
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {confirmEmotion == 'neutral' ? 'Regenerating "neutral" will generate a new visual summary and invalidate ALL emotion images for this outfit.' : 'This may take a minute'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setConfirmEmotion(null);
                        }}
                    >No</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setConfirmEmotion(null);
                            if (onRegenerate && confirmEmotion) {
                                onRegenerate(speaker, selectedOutfit ?? DEFAULT_OUTFIT_NAME, confirmEmotion);
                            }
                        }}
                    >Yes</Button>
                </DialogActions>
            </Dialog>
        </div>)}
    </>);
};

export default SpeakerSettings;