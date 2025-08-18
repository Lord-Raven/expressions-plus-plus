import React, {useState, useRef, useEffect} from "react";
import {motion} from "framer-motion";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, Typography, TextField, IconButton, Tooltip
} from "@mui/material";
import { Tabs, Tab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Background } from "./Background";
import EditModeFields, { EditModeFieldConfig } from "./EditModeFields";

export interface BackgroundSettingsHandle {
    setOpen: (open: boolean) => void;
}

type BackgroundSettingsProps = {
    register?: (handle: BackgroundSettingsHandle) => void;
    stage: any;
    borderColor: string;
    onRegenerate?: (background: Background) => void;
};

const BackgroundInfoIcon = ({
                            isAltered,
                            isErrored,
                            description,
                        }: {
    isAltered: boolean;
    isErrored: boolean;
    description: string;
}) => {
    let Icon = InfoOutlinedIcon;
    let color: "primary" | "warning" | "error" = "primary";

    if (isErrored) {
        Icon = ErrorOutlineIcon;
        color = "error";
    } else if (isAltered) {
        Icon = WarningAmberIcon;
        color = "warning";
    }

    return (
        <Tooltip title={<>Prompt used for image generation:<br/><br/>{description}
                    {isErrored && (<><br/><br/><Icon fontSize="inherit" color={color} />This prompt failed to generate an image and may contain words that could trigger sensitive content. Regenerate the background to build a new prompt and try again. Consider reporting recurring false positives to the stage developer.</>)}
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

const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({register, stage, borderColor, onRegenerate}) => {

    // Ref for dialog content scroll
    const dialogContentRef = useRef<HTMLDivElement>(null);

    const [open, setOpen] = useState<boolean>(false);
    const [selectedBackground, setSelectedBackground] = useState<string>('');
    const [editMode, setEditMode] = useState('json');
    const [confirmRegenerate, setConfirmRegenerate] = useState<Background | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [backgrounds, setBackgrounds] = useState<{[key: string]: Background}>({});
    const [backgroundIds, setBackgroundIds] = useState<string[]>([]);
    const NEW_BACKGROUND_NAME = 'New Background';

    useEffect(() => {
        setBackgrounds( stage.backgrounds ?? {});
        setBackgroundIds(Object.keys(stage.backgrounds ?? {}));
        setSelectedBackground(stage.chatState.selectedBackground ?? Object.keys(stage.backgrounds ?? {})[0] ?? '');
        stage.updateBackgroundsStorage();
    }, [open, stage.backgrounds, stage.chatState.selectedBackground]);

    useEffect(() => {
        register?.({ setOpen });
        return () => register?.(undefined!);
    }, [register]);

    // Delete tab with Delete key if not focused on input/textarea/contenteditable
    useEffect(() => {
        if (!open) return;
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
                if (selectedBackground && backgroundIds.length > 1) {
                    setConfirmDelete(selectedBackground);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, selectedBackground, backgroundIds]);

    const updateStageBackgrounds = (newBackgrounds: {[key: string]: Background}) => {
        stage.backgrounds = newBackgrounds;
        setBackgrounds(newBackgrounds);
        setBackgroundIds(Object.keys(newBackgrounds));
        // If selected background no longer exists, select the first available one
        if (!(stage.chatState.selectedBackground in newBackgrounds)) {
            const firstId = Object.keys(newBackgrounds)[0];
            if (firstId) {
                stage.chatState.selectedBackground = firstId;
                setSelectedBackground(firstId);
                stage.setSelectedBackground(firstId);
                stage.updateChatState();
            }
        }
    }

    const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const handleNewTabRef = (id: string) => (el: HTMLDivElement | null) => {
        tabRefs.current[id] = el;
        if (selectedBackground === id && el) {
            el.scrollIntoView({ behavior: "smooth", inline: "end" });
        }
    };

    const EditableTabLabel = ({
                                  background,
                                  onRename,
                                  onDelete
                              }: {
        background: Background;
        onRename: (newName: string) => void;
        onDelete: () => void;
    }) => {
        const [editing, setEditing] = useState(false);
        const [value, setValue] = useState(background.name);

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
                    sx={{ width: 120 }}
                />
                <IconButton
                    size="small"
                    onClick={onDelete}
                    sx={{ ml: 0.5 }}
                    aria-label="Delete background"
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>
        ) : (
            <span onDoubleClick={() => setEditing(true)}>
                {background.name}
                {background.artPrompt && (
                    <BackgroundInfoIcon
                        description={background.artPrompt}
                        isAltered={background.artPrompt !== background.artPrompt} // TODO: implement substitute function for backgrounds if needed
                        isErrored={!background.backgroundUrl}/>
                )}
            </span>
        );
    };

    const handleBackgroundRename = (backgroundId: string, newName: string) => {
        if (newName.trim() === '') return;
        const updatedBackgrounds = { ...backgrounds };
        updatedBackgrounds[backgroundId] = { ...updatedBackgrounds[backgroundId], name: newName };
        updateStageBackgrounds(updatedBackgrounds);
    };

    // Actual delete logic
    const doDeleteBackground = (backgroundId: string) => {
        const {[backgroundId]: removed, ...rest} = backgrounds;
        if (selectedBackground === backgroundId) {
            const fallback = Object.keys(rest)[0] ?? '';
            setSelectedBackground(fallback);
            if (fallback) {
                stage.chatState.selectedBackground = fallback;
                stage.setSelectedBackground(fallback);
            }
        }
        updateStageBackgrounds(rest);
    };

    // Show confirmation dialog before deleting
    const handleBackgroundDelete = (backgroundId: string) => {
        setConfirmDelete(backgroundId);
    };

    const createNewBackground = () => {
        const newBackground = stage.createNewBackground(NEW_BACKGROUND_NAME);
        const updatedBackgrounds = { ...backgrounds, [newBackground.id]: newBackground };
        updateStageBackgrounds(updatedBackgrounds);
        setSelectedBackground(newBackground.id);
        stage.chatState.selectedBackground = newBackground.id;
        stage.setSelectedBackground(newBackground.id);
    };

    const currentBackground = selectedBackground ? backgrounds[selectedBackground] : null;

    return (<>
        {open && (
            <div>
                <Dialog open={true} onClose={() => setOpen(false)} slotProps={{paper: {sx: {backgroundColor: "#333", border: `3px solid ${borderColor}`, borderRadius: 2}}}}>
                    <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, backgroundColor: "#333" }}>
                        <Typography variant="h6" component="div">
                            <b>Manage Backgrounds</b>
                        </Typography>
                        <IconButton
                            onClick={() => setOpen(false)}
                            aria-label={"Close"}
                            size={"small"}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{p: 1, backgroundColor: "#333", minWidth: 500}} ref={dialogContentRef}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Manage background images and their settings. Each background has an art prompt used for generation, visual colors for UI theming, and trigger words for automatic switching.
                        </Typography>
                        
                        {backgroundIds.length > 0 && (
                            <Tabs
                                value={selectedBackground || backgroundIds[0]}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{m: 0}}
                                slotProps={{
                                    indicator: {sx: {backgroundColor: borderColor, height: "3px"}}
                                }}
                                onChange={(_, newValue) => {
                                    if (newValue === "__add_new__") {
                                        createNewBackground();
                                    } else {
                                        setSelectedBackground(newValue);
                                    }
                                }}
                            >
                                {backgroundIds.map((backgroundId) => (
                                    <Tab
                                        key={`background_tab_${backgroundId}`}
                                        label={<EditableTabLabel
                                            background={backgrounds[backgroundId]}
                                            onRename={(newName) => handleBackgroundRename(backgroundId, newName)}
                                            onDelete={() => handleBackgroundDelete(backgroundId)}
                                        />}
                                        sx={{p: 1}}
                                        value={backgroundId}
                                        ref={handleNewTabRef(backgroundId)}
                                    />
                                ))}
                                {backgroundIds.length < 6 && (
                                    <Tab
                                        icon={<AddIcon />}
                                        key={`new_background_tab`}
                                        value="__add_new__"
                                        sx={{ minWidth: 50, p: 1 }}
                                    />
                                )}
                            </Tabs>
                        )}

                        {currentBackground && (
                            <Box sx={{ mt: 2 }}>
                                {/* Large background image display */}
                                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                                    <Button
                                        component={motion.div}
                                        whileHover={{scale: 1.05}}
                                        variant="outlined"
                                        sx={{
                                            width: 400, 
                                            height: 200,
                                            p: 0,
                                            display: "flex",
                                            alignItems: "flex-end",
                                            justifyContent: "center",
                                            borderRadius: 2,
                                            backgroundImage: currentBackground.backgroundUrl ? `url(${currentBackground.backgroundUrl})` : 'none',
                                            backgroundPosition: "center",
                                            backgroundSize: "cover",
                                            backgroundColor: currentBackground.backgroundUrl ? "#444" : "#222",
                                            color: "#fff",
                                            fontWeight: 600,
                                            textShadow: "0 1px 2px #000",
                                            border: `3px solid ${borderColor}`,
                                        }}
                                        onClick={() => setConfirmRegenerate(currentBackground)}
                                    >
                                        {!currentBackground.backgroundUrl && (
                                            <span style={{
                                                background: "rgba(0,0,0,0.7)",
                                                borderRadius: 4,
                                                padding: "8px 12px",
                                                fontSize: 14,
                                                textAlign: "center"
                                            }}>
                                                Click to Generate
                                            </span>
                                        )}
                                    </Button>
                                </Box>

                                {/* Editing controls section */}
                                <Box sx={{ mt: 3 }}>
                                    <EditModeFields
                                        fields={[
                                            {
                                                type: 'global',
                                                label: currentBackground.global ? 'Global Background' : 'Local Background',
                                                value: currentBackground.global || false,
                                                onChange: (val: boolean) => {
                                                    const updatedBackgrounds = { ...backgrounds, [selectedBackground]: { ...currentBackground, global: val } };
                                                    updateStageBackgrounds(updatedBackgrounds);
                                                },
                                                visible: stage.owns.includes("1")
                                            },
                                            {
                                                type: 'artPrompt',
                                                label: 'Art Prompt',
                                                value: currentBackground.artPrompt || "",
                                                onChange: (val: string) => {
                                                    const updatedBackgrounds = { ...backgrounds, [selectedBackground]: { ...currentBackground, artPrompt: val } };
                                                    updateStageBackgrounds(updatedBackgrounds);
                                                }
                                            },
                                            /*{
                                                type: 'keywords',
                                                label: 'Comma-Delimited Trigger Words',
                                                value: currentBackground.triggerWords || "",
                                                onChange: (val: string) => {
                                                    const updatedBackgrounds = { ...backgrounds, [selectedBackground]: { ...currentBackground, triggerWords: val } };
                                                    updateStageBackgrounds(updatedBackgrounds);
                                                }
                                            },*/
                                            {
                                                type: 'borderColor',
                                                label: 'Border Color',
                                                value: currentBackground.borderColor || "",
                                                onChange: (val: string) => {
                                                    const updatedBackgrounds = { ...backgrounds, [selectedBackground]: { ...currentBackground, borderColor: val } };
                                                    updateStageBackgrounds(updatedBackgrounds);
                                                },
                                                width: 'small'
                                            },
                                            {
                                                type: 'highlightColor',
                                                label: 'Lighting Color',
                                                value: currentBackground.highlightColor || "",
                                                onChange: (val: string) => {
                                                    const updatedBackgrounds = { ...backgrounds, [selectedBackground]: { ...currentBackground, highlightColor: val } };
                                                    updateStageBackgrounds(updatedBackgrounds);
                                                },
                                                width: 'small'
                                            },
                                            {
                                                type: 'json',
                                                label: 'JSON for Import/Export',
                                                value: JSON.stringify(currentBackground, null, 2),
                                                onChange: (val: string) => {
                                                    try {
                                                        const data = JSON.parse(val);
                                                        if (typeof data === 'object' && data && 'id' in data && 'name' in data) {
                                                            const updatedBackgrounds = { ...backgrounds, [selectedBackground]: data as Background };
                                                            updateStageBackgrounds(updatedBackgrounds);
                                                        }
                                                    } catch (err) {
                                                        // Invalid JSON, don't update
                                                        console.error("Invalid JSON format", err);
                                                    }
                                                },
                                            }
                                        ] as EditModeFieldConfig[]}
                                        editMode={editMode}
                                        setEditMode={setEditMode}
                                        dialogContentRef={dialogContentRef}
                                    />
                                </Box>
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Confirmation dialog */}
                <Dialog
                    sx={{border: `3px solid ${borderColor}`, borderRadius: 2}}
                    open={!!confirmRegenerate}
                    onClose={() => setConfirmRegenerate(null)}
                >
                    <DialogTitle sx={{p: 1, backgroundColor: "#333"}}>
                        Confirm Background Generation
                    </DialogTitle>
                    <DialogContent sx={{p: 1, backgroundColor: "#333"}}>
                        <Typography>
                            Generate background image for <b>{confirmRegenerate?.name}</b>?
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            This may take a minute and will create a new background image.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setConfirmRegenerate(null)}
                        >No</Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                                const bg = confirmRegenerate;
                                setConfirmRegenerate(null);
                                if (onRegenerate && bg) {
                                    onRegenerate(bg);
                                }
                            }}
                        >Yes</Button>
                    </DialogActions>
                </Dialog>

                {/* Confirmation dialog for deletion */}
                <Dialog
                    sx={{border: `3px solid ${borderColor}`, borderRadius: 2}}
                    open={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                >
                    <DialogTitle sx={{p: 1, backgroundColor: "#333"}}>
                        Confirm Background Deletion
                    </DialogTitle>
                    <DialogContent sx={{p: 1, backgroundColor: "#333"}}>
                        <Typography>
                            Delete background <b>{confirmDelete ? backgrounds[confirmDelete]?.name : ""}</b>?
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
                                if (confirmDelete) doDeleteBackground(confirmDelete);
                                setConfirmDelete(null);
                            }}
                        >Yes, Delete</Button>
                    </DialogActions>
                </Dialog>
            </div>
        )}
    </>);
};

export default BackgroundSettings;
