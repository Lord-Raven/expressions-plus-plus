import React, {useState, useRef, useEffect} from "react";
import {substitute} from "./Expressions";
import { Speaker } from "@chub-ai/stages-ts";
import {motion} from "framer-motion";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, Typography, TextField, IconButton, Tooltip, MenuItem
} from "@mui/material";
import { Grid, Tabs, Tab } from "@mui/material";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import silhouetteUrl from './assets/silhouette.png'
import { Emotion, EMOTION_PROMPTS } from "./Emotion";
import EditModeFields, { EditModeFieldConfig } from "./EditModeFields";
import { generateUUID } from "three/src/math/MathUtils.js";

export interface SpeakerSettingsHandle {
    setSpeaker: (speaker: Speaker|null) => void;
}

type SpeakerSettingsProps = {
    register?: (handle: SpeakerSettingsHandle) => void;
    stage: any;
    borderColor: string;
    onRegenerate?: (speaker: Speaker, outfit: string, emotion: Emotion, fromOutfit: string) => void;
};

const OutfitInfoIcon = ({
                            isAltered,
                            isErrored,
                            isLocked,
                        }: {
    isAltered: boolean;
    isErrored: boolean;
    isLocked: boolean;
}) => {
    let Icon = InfoOutlinedIcon;
    let color: "primary" | "warning" | "error" = "primary";

    if (isLocked) {
        Icon = LockOutlineIcon;
        color = "primary";
    } else if (isErrored) {
        Icon = ErrorOutlineIcon;
        color = "error";
    } else if (isAltered) {
        Icon = WarningAmberIcon;
        color = "warning";
    }

    return (
        <Tooltip title={isLocked ? (<><Icon fontSize="inherit" color={color} />This outfit cannot be altered.</>) :
                (<>Double-click or tap this tab to edit its name.
                    {isErrored && (<><br/><br/><Icon fontSize="inherit" color={color} />The art prompt failed to generate an image. This could be due to exhausted daily credits or sensitive content in the prompt; consider reporting false positives to the stage developer.</>)}
                    {isAltered && !isErrored && (<><br/><br/><Icon fontSize="inherit" color={color} />The art prompt was automatically altered from its original form to avoid triggering a sensitive content failure; if the result appears fine, you may disregard this warning.</>)}
                    </>)}
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

const SpeakerSettings: React.FC<SpeakerSettingsProps> = ({register, stage, borderColor, onRegenerate}) => {
    // Ref for dialog content scroll
    const dialogContentRef = useRef<HTMLDivElement>(null);
    // Refs for edit fields
    const MAX_OUTFIT_COUNT = 20;
    const [speaker, setSpeaker] = useState<Speaker|null>(null);
    const [selectedOutfit, setSelectedOutfit] = useState<string>("");
    const [editMode, setEditMode] = useState('json');
    const [confirmEmotion, setConfirmEmotion] = useState<Emotion | null>(null);
    const [outfitMap, setOutfitMap] = useState<{[key: string]: any}>({});
    const [outfitKeys, setOutfitKeys] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const NEW_OUTFIT_NAME = 'Unnamed Outfit';
    // Delete tab with Delete key if not focused on input/textarea/contenteditable
    useEffect(() => {
        if (!speaker) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete") {
                const active = document.activeElement;
                if (
                    active && (
                        active.tagName === "INPUT" ||
                        active.tagName === "TEXTAREA" ||
                        (active as HTMLElement).isContentEditable
                    )
                ) {
                    return;
                }
                // Only delete if a tab is selected and more than one tab exists
                if (selectedOutfit && outfitKeys.length > 1) {
                    setConfirmDelete(selectedOutfit);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [speaker, selectedOutfit, outfitKeys]);

    useEffect(() => {
        stage.updateChatState();
        stage.updateWardrobeStorage();
        if (speaker) {
            console.log(`setSpeaker: ${speaker?.name}, ${speaker?.anonymizedId}, ` +
                `${stage.chatState.selectedOutfit[speaker?.anonymizedId ?? ''] || stage.messageState.speakerOutfit[speaker?.anonymizedId ?? ''] || Object.keys(stage.wardrobes[speaker.anonymizedId].outfits)[0] || ''}`);
            console.log(stage.wardrobes[speaker.anonymizedId].outfits);
            setSelectedOutfit((stage.chatState.selectedOutfit[speaker.anonymizedId] || stage.messageState.speakerOutfit[speaker.anonymizedId] || Object.keys(stage.wardrobes[speaker.anonymizedId].outfits)[0]) || "");
            setOutfitMap((stage.wardrobes[speaker.anonymizedId].outfits) ?? {});
            setOutfitKeys(Object.keys(stage.wardrobes[speaker.anonymizedId].outfits) ?? []);
        }
    }, [speaker]);

    useEffect(() => {
        register?.({ setSpeaker });
        return () => register?.(undefined!);
    }, [register]);

    const updateStageWardrobeMap = (newMap: {[key: string]: any}) => {
        if (speaker) {
            stage.wardrobes[speaker.anonymizedId].outfits = newMap;
            setOutfitMap(newMap);
            setOutfitKeys(Object.keys(newMap));
            if (stage.chatState.selectedOutfit[speaker.anonymizedId] && !(stage.chatState.selectedOutfit[speaker.anonymizedId] in stage.wardrobes[speaker.anonymizedId].outfits)) {
                stage.chatState.selectedOutfit[speaker.anonymizedId] = Object.keys(stage.wardrobes[speaker.anonymizedId].outfits).length > 0 ? 
                        Object.keys(stage.wardrobes[speaker.anonymizedId].outfits)[0] : 
                        "";
            }
        }
    }

    const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const handleNewTabRef = (name: string) => (el: HTMLDivElement | null) => {
        tabRefs.current[name] = el;
        if (selectedOutfit === name && el) {
            el.scrollIntoView({ behavior: "smooth", inline: "end" });
        }
    };

    const checkIsLocked: (key: string) => boolean = key => {
        return !outfitMap[key]?.generated || // Non-generated outfits are immutable
            !stage.canEdit.includes(speaker?.anonymizedId || "") || // Outfits belonging to characters this user can't edit
            (stage.wardrobes[speaker?.anonymizedId || ""].outfits[key]?.global === true && !stage.owns.includes(speaker?.anonymizedId || "")); // Global outfits not owned by user are ineditable
    };

    const EditableTabLabel = ({
                                  outfitKey,
                                  onRename,
                                  onDelete
                              }: {
        outfitKey: string;
        onRename: (newName: string) => void;
        onDelete: () => void;
    }) => {
        const [editing, setEditing] = useState(false);
        const [value, setValue] = useState(outfitMap[outfitKey]?.name || outfitKey);
        const locked = checkIsLocked(outfitKey);

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
            <span onDoubleClick={() => setEditing(!locked)}>
                {value}
                {speaker && outfitMap[outfitKey] && (
                    <OutfitInfoIcon
                        isLocked={locked}
                        isAltered={stage.buildArtPrompt(speaker, value, Emotion.neutral) != substitute(stage.buildArtPrompt(speaker, value, Emotion.neutral))}
                        isErrored={stage.getSpeakerImage(speaker.anonymizedId, value, Emotion.neutral, silhouetteUrl) == ''}/>
                )}
            </span>
        );
    };

    const handleOutfitRename = (key: string, newName: string) => {
        if (newName.trim() == '') return; // reject empty names
        outfitMap[key].name = newName.trim();

        updateStageWardrobeMap(outfitMap);
    };

    const handleOutfitDelete = (key: string) => {
    // Can't delete the last outfit
    if (outfitKeys.length < 2) return;
    setConfirmDelete(key);
    };

    return (<>
    {speaker && (<div>
            <Dialog 
                open={true} 
                onClose={() => setSpeaker(null)} 
                slotProps={{paper: {sx: {backgroundColor: "#333", border: `3px solid ${borderColor}`, borderRadius: 2}}}}
                disableEnforceFocus
                disableAutoFocus
                disableScrollLock
                disableRestoreFocus
            >
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
                <DialogContent sx={{p: 1, backgroundColor: "#333"}} ref={dialogContentRef}>
                    <Typography variant="body2">
                        For each outfit, a physical description and neutral image are generated and other emotions are created from the neutral base image. Rename or remove additional outfits by double-clicking their tabs; an outfit's name will help steer its generation.
                    </Typography>
                    <Tabs
                        value={selectedOutfit || outfitKeys[0]}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                            m: 0,
                            maxWidth: '100%',
                            '& .MuiTabs-scrollButtons': {
                                '&.Mui-disabled': {
                                    opacity: 0.3,
                                },
                            },
                        }}
                        slotProps={{
                            indicator: {sx: {backgroundColor: borderColor, height: "3px"}}
                        }}
                        onChange={(_, newValue) => {
                            if (newValue === "__add_new__") {
                                const newName = NEW_OUTFIT_NAME;
                                const newGuid = generateUUID();
                                updateStageWardrobeMap({...outfitMap, [newGuid]: {name: newName, generated: true, images: {}, artPrompt: "", triggerWords: "", global: false}});
                                setSelectedOutfit(newGuid);

                            } else {
                                setSelectedOutfit(newValue);
                                setEditMode(!checkIsLocked(selectedOutfit) ? editMode : 'json');
                            }
                        }}
                    >
                        {outfitKeys.map((outfitKey) => (
                            <Tab
                                key={`outfit_tab_${outfitKey}`}
                                label={<EditableTabLabel
                                    outfitKey={outfitKey}
                                    onRename={(newName) => handleOutfitRename(outfitKey, newName)}
                                    onDelete={() => handleOutfitDelete(outfitKey)}
                                />}
                                sx={{p: 1}}
                                value={outfitKey}
                                ref={handleNewTabRef(outfitKey)}
                            />
                        ))}
                        {outfitKeys.length < MAX_OUTFIT_COUNT && !outfitKeys.includes(NEW_OUTFIT_NAME) && (
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
                            const image = stage.getSpeakerImage(
                                speaker.anonymizedId,
                                selectedOutfit ?? "",
                                emotion as Emotion,
                                silhouetteUrl
                            );

                            const isDefault = (emotion != Emotion.neutral && image == stage.getSpeakerImage(speaker.anonymizedId, selectedOutfit, Emotion.neutral)) || (image == silhouetteUrl);
                            const locked = checkIsLocked(selectedOutfit);

                            return (
                                (!isDefault || !locked ? (
                                <Grid key={emotion} component={motion.div}
                                      initial={{opacity: 0, x: 50}}
                                      whileHover={{scale: 1.1, zIndex: 2000}}
                                      animate={{opacity: 1, x: 0}}
                                      transition={{duration: 0.3, delay: index * 0.05}}>
                                    <Button
                                        variant="outlined"
                                        sx={{
                                            width: 100, height: 100,
                                            p: 0,
                                            display: "flex",
                                            alignItems: "flex-end",
                                            justifyContent: "center",
                                            borderRadius: 2,
                                            backgroundImage: `url(${image})`,
                                            backgroundPosition: "center top",
                                            backgroundSize: "cover",
                                            backgroundColor: isDefault ? "#222" : "#444",
                                            color: isDefault ? "#666" : "#222",
                                            fontWeight: 600,
                                            textShadow: "0 1px 2px #fff",
                                            border: `3px solid ${borderColor}`,
                                        }}
                                        onClick={() => !locked && setConfirmEmotion(emotion as Emotion)}
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
                    
                    <Box sx={{ mt: 3 }}>
                        <EditModeFields
                            fields={[
                                {
                                    type: 'global',
                                    label: (outfitMap[selectedOutfit]?.global || false) ? 'Global Outfit' : 'Local Outfit',
                                    value: outfitMap[selectedOutfit]?.global || false,
                                    onChange: (val: string) => {
                                        const updatedMap = { ...outfitMap, [selectedOutfit]: { ...outfitMap[selectedOutfit], global: val } };
                                        updateStageWardrobeMap(updatedMap);
                                    },
                                    visible: outfitMap[selectedOutfit]?.generated && stage.owns.includes(speaker.anonymizedId)
                                },
                                {
                                    type: 'artPrompt',
                                    label: 'Art Prompt',
                                    value: outfitMap[selectedOutfit]?.artPrompt || "",
                                    onChange: (val: string) => {
                                        const updatedMap = { ...outfitMap, [selectedOutfit]: { ...outfitMap[selectedOutfit], artPrompt: val } };
                                        updateStageWardrobeMap(updatedMap);
                                    },
                                    visible: outfitMap[selectedOutfit]?.generated,
                                    disabled: checkIsLocked(selectedOutfit),
                                },
                                {
                                    type: 'keywords',
                                    label: 'Comma-Delimited Keywords',
                                    value: outfitMap[selectedOutfit]?.triggerWords || "",
                                    onChange: (val: string) => {
                                        const updatedMap = { ...outfitMap, [selectedOutfit]: { ...outfitMap[selectedOutfit], triggerWords: val } };
                                        updateStageWardrobeMap(updatedMap);
                                    },
                                    visible: outfitMap[selectedOutfit]?.generated,
                                    disabled: checkIsLocked(selectedOutfit),
                                },
                                {
                                    type: 'json',
                                    label: 'JSON for Import/Export',
                                    value: JSON.stringify(outfitMap[selectedOutfit], ['name', 'images', 'artPrompt', 'triggerWords', ...Object.keys(EMOTION_PROMPTS)], 2),
                                    onChange: (val: string) => {
                                        try {
                                            const data = JSON.parse(val);
                                            if (typeof data === 'object' && data && 'images' in data && 'name' in data && 'artPrompt' in data && 'triggerWords' in data) {
                                                const updatedMap = { ...outfitMap, [selectedOutfit]: {...data, generated: outfitMap[selectedOutfit].generated, global: outfitMap[selectedOutfit].global} };
                                                updateStageWardrobeMap(updatedMap);
                                            }
                                        } catch (err) {
                                            console.error("Invalid JSON format", err);
                                            stage.wrapPromise(null, "Invalid outfit update.");
                                        }
                                    },
                                    disabled:  checkIsLocked(selectedOutfit),

                                },

                            ] as EditModeFieldConfig[]}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            dialogContentRef={dialogContentRef}
                        />
                    </Box>
                </DialogContent>
            </Dialog>
            {/* Confirmation dialog for deletion */}
            <Dialog
                sx={{border: `3px solid ${borderColor}`, borderRadius: 2}}
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
            >
                <DialogTitle sx={{p: 1, backgroundColor: "#333"}}>
                    Confirm Outfit Deletion
                </DialogTitle>
                <DialogContent sx={{p: 1, backgroundColor: "#333"}}>
                    <Typography>
                        Delete outfit <b>{confirmDelete ? outfitMap[confirmDelete]?.name : ""}</b>?
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmDelete(null)}
                    >No</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                            if (confirmDelete && outfitKeys.length > 1) {
                                const {[confirmDelete]: removed, ...rest} = outfitMap;
                                if (selectedOutfit === confirmDelete) {
                                    setSelectedOutfit(Object.keys(rest)[0]);
                                }
                                updateStageWardrobeMap(rest);
                            }
                            setConfirmDelete(null);
                        }}
                    >Yes, Delete</Button>
                </DialogActions>
            </Dialog>
            {/* Confirmation dialog for emotion regeneration */}
            <Dialog
                sx={{border: `3px solid ${borderColor}`, borderRadius: 2}}
                open={!!confirmEmotion}
                onClose={() => setConfirmEmotion(null)}
            >
                <DialogTitle sx={{ p: 1, backgroundColor: "#333" }}>
                    Regenerate or Replace Emotion Image
                </DialogTitle>
                <DialogContent sx={{ p: 2, backgroundColor: "#333", minHeight: 320, display: 'flex', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' }}>
                    <Box
                        sx={{
                            width: 240,
                            minHeight: 320,
                            border: '2px dashed #888',
                            borderRadius: 3,
                            background: '#222',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            mr: 3,
                        }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file && file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                    stage.uploadFile(`${selectedOutfit}_${confirmEmotion}.png`, file).then((url: string) => {
                                        const updatedMap = { ...outfitMap };
                                        if (!updatedMap[selectedOutfit].images) updatedMap[selectedOutfit].images = {};
                                        if (confirmEmotion) {
                                            updatedMap[selectedOutfit].images[confirmEmotion] = url;
                                        }
                                        updateStageWardrobeMap(updatedMap);
                                    }).catch(() => {
                                        stage.wrapPromise(null, "Failed to upload image.");
                                    });
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                    >
                        {confirmEmotion && outfitMap[selectedOutfit]?.images?.[confirmEmotion] ? (
                            <img
                                src={outfitMap[selectedOutfit].images[confirmEmotion]}
                                alt={`${confirmEmotion} preview`}
                                style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 3 }}
                            />
                        ) : (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                                Drag & drop an image here to replace, or click Regenerate.
                            </Typography>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', left: 0, top: 0 }}
                            title="Upload image"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file && file.type.startsWith('image/')) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        stage.uploadFile(`${selectedOutfit}_${confirmEmotion}.png`, file).then((url: string) => {
                                            const updatedMap = { ...outfitMap };
                                            if (!updatedMap[selectedOutfit].images) updatedMap[selectedOutfit].images = {};
                                            if (confirmEmotion) {
                                                updatedMap[selectedOutfit].images[confirmEmotion] = url;
                                            }
                                            updateStageWardrobeMap(updatedMap);
                                        }).catch(() => {
                                            stage.wrapPromise(null, "Failed to upload image.");
                                        });
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography sx={{ mb: 2 }}>
                            <b>{speaker.name}</b> — <b>{confirmEmotion}</b> emotion
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                            You can drag/drop or upload a new image, or click Regenerate to create one.
                            {confirmEmotion == 'neutral' && <><br />Regenerating "neutral" will generate a new visual summary and invalidate ALL emotion images for this outfit.</>}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center', width: '100%' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    setConfirmEmotion(null);
                                    if (onRegenerate && confirmEmotion) {
                                        onRegenerate(speaker, selectedOutfit ?? "", confirmEmotion, "");
                                    }
                                }}
                            >Regenerate</Button>
                        </Box>
                        {/* "Clone From" drop-down for selecting a different outfit to create this outfit from; if this is neutral and an outfit exists
                        allow it to be generated from the neutral image of another outfit.
                        This drop-down allows selection of any outfit, and will use that image and a simplified prompt to render a new neutral image. */}
                        {confirmEmotion == 'neutral' && outfitKeys.filter(key => outfitMap[key].images[Emotion.neutral]).length > 0
                        && (<Box sx={{ mt: 4, width: '100%', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                                Or clone from an existing outfit. You may choose this outfit to re-generate from the current image; this allows you to upload any picture of a character and convert it into a standing portrait:
                            </Typography>
                            <TextField
                                select
                                value=""
                                onChange={e => {
                                    const fromOutfit = e.target.value;
                                    if (fromOutfit && fromOutfit in outfitMap) {
                                        setConfirmEmotion(null);
                                        if (onRegenerate) {
                                            onRegenerate(speaker, selectedOutfit ?? "", Emotion.neutral, fromOutfit);
                                        }
                                    }
                                }}
                                variant="outlined"
                                size="small"
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="" disabled>Clone from...</MenuItem>
                                {outfitKeys.filter(key => outfitMap[key].images[Emotion.neutral]).map(k => (
                                    <MenuItem key={`cloneFrom_${k}`} value={k}>{outfitMap[k]?.name || k}</MenuItem>
                                ))}
                            </TextField>
                        </Box>)}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setConfirmEmotion(null);
                        }}
                    >Accept</Button>
                </DialogActions>
            </Dialog>
        </div>)}
    </>);
};

export default SpeakerSettings;