import React, {useState, useRef, useEffect} from "react";
import {DEFAULT_OUTFIT_NAME, Emotion, EMOTION_PROMPTS, substitute} from "./Expressions";
import { Speaker } from "@chub-ai/stages-ts";
import {motion} from "framer-motion";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, Typography, TextField, IconButton, Tooltip
} from "@mui/material";
import { Grid, Tabs, Tab } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import silhouetteUrl from './assets/silhouette.png'
import { SpeakerSettingsHandle } from "./SpeakerSettings";

type NewSpeakerSettingsProps = {
    register?: (handle: SpeakerSettingsHandle) => void;
    stage: any;
    borderColor: string;
    onRegenerate?: (speaker: Speaker, outfit: string, emotion: Emotion) => void;
};

const OutfitInfoIcon = ({
                            isAltered,
                            isErrored,
                            isLocked,
                            description,
                        }: {
    isAltered: boolean;
    isErrored: boolean;
    isLocked: boolean;
    description: string;
}) => {
    let Icon = InfoOutlinedIcon;
    let color: "primary" | "warning" | "error" = "primary";

    if (isLocked) {
        Icon = LockIcon;
        color = "primary"; // Locked outfits are not considered errors or warnings, just informational.
        description = "This outfit was built by an expression pack and cannot be altered.";
    } else if (isErrored) {
        Icon = ErrorOutlineIcon;
        color = "error";
    } else if (isAltered) {
        Icon = WarningAmberIcon;
        color = "warning";
    }

    return (
        <Tooltip title={<>Prompt used for image generation:<br/><br/>{description}
                    {isErrored && (<><br/><br/><Icon fontSize="inherit" color={color} />This prompt failed to generate an image and may contain words that could trigger sensitive content. Regenerate the neutral image to build a new prompt and try again. Consider reporting recurring false positives to the stage developer.</>)}
                    {isAltered && !isErrored && (<><br/><br/><Icon fontSize="inherit" color={color} />This prompt was automatically altered from its original form to avoid triggering a sensitive content failure; if the result appears fine, you may disregard this warning.</>)}
                    </>}
                arrow enterDelay={300} leaveDelay={150}>
            <IconButton
                size="small"
                sx={{ ml: 1, p: 0.5 }}
                onClick={(e) => e.stopPropagation()}
            >
                <Icon fontSize="inherit" color={color} />
            </IconButton>
        </Tooltip>
    );
};

const NewSpeakerSettings: React.FC<NewSpeakerSettingsProps> = ({register, stage, borderColor, onRegenerate}) => {
    const [speaker, setSpeaker] = useState<Speaker|null>(null);
    const [selectedOutfit, setSelectedOutfit] = useState<string>(DEFAULT_OUTFIT_NAME);
    const [confirmEmotion, setConfirmEmotion] = useState<Emotion | null>(null);
    const [outfitMap, setOutfitMap] = useState<{[key: string]: any}>({[DEFAULT_OUTFIT_NAME]: {}});
    const [outfitNames, setOutfitNames] = useState<string[]>([DEFAULT_OUTFIT_NAME]);
    const NEW_OUTFIT_NAME = 'Unnamed Outfit';

    useEffect(() => {
        setSelectedOutfit((speaker ? stage.chatState.selectedOutfit[speaker.anonymizedId] : null) ?? DEFAULT_OUTFIT_NAME);
        setOutfitMap((speaker ? stage.wardrobes[speaker.anonymizedId] : {}) ?? {[DEFAULT_OUTFIT_NAME]: {}});
        setOutfitNames(Object.keys(speaker ? stage.wardrobes[speaker.anonymizedId] : {[DEFAULT_OUTFIT_NAME]: {}}) ?? {[DEFAULT_OUTFIT_NAME]: {}});
    }, [speaker]);

    useEffect(() => {
        register?.({ setSpeaker });
        return () => register?.(undefined!);
    }, [register]);

    const updateStageWardrobeMap = (newMap: {[key: string]: any}) => {
        if (speaker) {
            stage.wardrobes[speaker.anonymizedId] = newMap;
            setOutfitMap(newMap);
            setOutfitNames(Object.keys(newMap));
            if (!(stage.chatState.selectedOutfit[speaker.anonymizedId] in stage.wardrobes[speaker.anonymizedId])) {
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
        const generated = stage.wardrobes[speaker?.anonymizedId || '']?.[name]?.generated || false;

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
            <span onDoubleClick={() => setEditing(generated)}>
                {name}
                {speaker && stage.chatState.generatedDescriptions[`${speaker.anonymizedId}_${value}`] && (
                    <OutfitInfoIcon
                        description={stage.buildArtPrompt(speaker, value, Emotion.neutral)}
                        isLocked={!generated}
                        isAltered={stage.buildArtPrompt(speaker, value, Emotion.neutral) != substitute(stage.buildArtPrompt(speaker, value, Emotion.neutral))}
                        isErrored={stage.getSpeakerImage(speaker.anonymizedId, value, Emotion.neutral, silhouetteUrl) == ''}/>
                )}
            </span>

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
            <Dialog open={true} onClose={() => setSpeaker(null)} slotProps={{paper: {sx: {backgroundColor: "#333", border: `3px solid ${borderColor}`, borderRadius: 2}}}}>
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, backgroundColor: "#333" }}>
                    <Typography variant="h6" component="div">
                        <b>Manage {speaker.name}</b>
                    </Typography>
                    <IconButton
                        onClick={() => setSpeaker(null)}
                        aria-label={"Close"}
                        size={"small"}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{p: 1, backgroundColor: "#333"}}>
                    <Typography variant="body2">
                        For each outfit, a physical description and neutral image are generated and all other emotions are created from the neutral base image. Rename or remove additional outfits by double-clicking their tabs; an outfit's name will help steer its generation.
                    </Typography>
                    <Tabs
                        value={selectedOutfit || outfitNames[0]}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{m: 0}}
                        slotProps={{
                            indicator: {sx: {backgroundColor: borderColor, height: "3px"}}
                        }}
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
                                sx={{p: 1}}
                                value={name}
                                ref={handleNewTabRef(name)}
                            />
                        ))}
                        {outfitNames.length < 6 && !outfitNames.includes(NEW_OUTFIT_NAME) && (
                            <Tab
                                icon={<AddIcon />}
                                key={`new_outfit_tab`}
                                value="__add_new__"
                                sx={{ minWidth: 50, p: 1 }}
                            />
                        )}
                    </Tabs>
                    <Grid container spacing={1} justifyContent="center" sx={{mt: 2, overflow: "hidden"}}>
                        {Object.keys(EMOTION_PROMPTS).map((emotion, index) => {
                            const generated: boolean = stage.wardrobes[speaker.anonymizedId]?.[selectedOutfit]?.generated || false;
                            const image = stage.getSpeakerImage(
                                speaker.anonymizedId,
                                selectedOutfit ?? DEFAULT_OUTFIT_NAME,
                                emotion as Emotion,
                                silhouetteUrl
                            );

                            const isDefault = (emotion != Emotion.neutral && image == stage.getSpeakerImage(speaker.anonymizedId, selectedOutfit, Emotion.neutral)) || (image == silhouetteUrl);

                            return (
                                (isDefault && !generated ? (
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
                                            backgroundColor: isDefault ? "#222" : "#444",
                                            color: isDefault ? "#666" : "#222",
                                            fontWeight: 600,
                                            textShadow: "0 1px 2px #fff",
                                            border: `3px solid ${borderColor}`,
                                        }}
                                        onClick={() => !generated && setConfirmEmotion(emotion as Emotion)}
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
                                </Grid>) : (<></>))
                            );
                        })}
                        
                    </Grid>
                    {/* JSON sync textfield for import/export */}
                    <Box sx={{ mt: 3 }}>
                    <TextField
                        label="Outfit JSON (edit description or copy/paste to export/import)"
                        fullWidth
                        value={(() => {
                            const images = outfitMap[selectedOutfit];
                            const descKey = speaker ? `${speaker.anonymizedId}_${selectedOutfit}` : '';
                            const description = speaker ? stage.chatState.generatedDescriptions[descKey] : undefined;
                            return JSON.stringify({ description, images }, null, 2);
                        })()}
                        onChange={e => {
                            let val = e.target.value;
                            try {
                                const data = JSON.parse(val);
                                if (typeof data === 'object' && data && 'images' in data && 'description' in data) {
                                    const updatedMap = { ...outfitMap, [selectedOutfit]: data.images };
                                    updateStageWardrobeMap(updatedMap);
                                    if (speaker) {
                                        stage.chatState.generatedDescriptions[`${speaker.anonymizedId}_${selectedOutfit}`] = data.description;
                                        stage.updateChatState();
                                    }
                                }
                            } catch (err) {
                                console.error("Invalid JSON format", err);
                                stage.wrapPromise(null, "Invalid outfit update.");
                            }
                        }}
                        sx={{ mt: 2, background: '#222', borderRadius: 2, fontFamily: 'monospace' }}
                        variant="outlined"
                    />
                </Box>
                </DialogContent>
            </Dialog>
            {/* Confirmation dialog */}
            <Dialog
                sx={{border: `3px solid ${borderColor}`, borderRadius: 2}}
                open={!!confirmEmotion}
                onClose={() => setConfirmEmotion(null)}
            >
                <DialogTitle sx={{p: 1, backgroundColor: "#333"}}>
                    Confirm Regeneration
                </DialogTitle>
                <DialogContent sx={{p: 1, backgroundColor: "#333"}}>
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

export default NewSpeakerSettings;