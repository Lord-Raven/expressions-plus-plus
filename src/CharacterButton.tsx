import React, { useState } from "react";
import { Emotion, EMOTION_PROMPTS } from "./Expressions";
import { Character } from "@chub-ai/stages-ts";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, IconButton
} from "@mui/material";
import { Grid } from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";

type CharacterButtonProps = {
    character: Character;
    stage: any;
    top: number;
    onRegenerate?: (character: Character, emotion: Emotion) => void;
};

const EMOTION_LIST = Object.values(Emotion);

const CharacterButton: React.FC<CharacterButtonProps> = ({
    character, stage, top, onRegenerate
}) => {
    const [open, setOpen] = useState(false);
    const [confirmEmotion, setConfirmEmotion] = useState<Emotion | null>(null);

    // Use neutral image as background for all emotion buttons
    const characterImage = stage.chatState.generatedPacks[character.anonymizedId][Emotion.neutral];

    return (
        <div style={{
            position: "absolute",
            top: top,
            right: 20,
            zIndex: 20,
        }}>
            <IconButton
                size="large"
                style={{
                    width: 40, height: 40,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
                title={`Regenerate image for ${character.name}`}
                onClick={() => setOpen(true)}
            >
                <AutorenewIcon />
            </IconButton>
            {/* Emotion selection dialog */}
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>
                    Regenerate image for <b>{character.name}</b>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Choose an emotion to regenerate:
                    </Typography>
                    <Grid container spacing={1}>
                        {EMOTION_LIST.map((emotion) => (
                            <Grid key={emotion}>
                                <Button
                                    variant="outlined"
                                    sx={{
                                        width: 64, height: 64,
                                        p: 0,
                                        borderRadius: 2,
                                        background: characterImage
                                            ? `url(${characterImage}) center top/cover no-repeat`
                                            : "#eee",
                                        backgroundPosition: "center top",
                                        backgroundSize: "100% 178%", // 16/9 = 1.78, so show top 9/16
                                        color: "#222",
                                        fontWeight: 600,
                                        textShadow: "0 1px 2px #fff",
                                        border: "2px solid #888"
                                    }}
                                    onClick={() => setConfirmEmotion(emotion)}
                                >
                                    <span style={{
                                        background: "rgba(255,255,255,0.7)",
                                        borderRadius: 4,
                                        padding: "2px 4px",
                                        fontSize: 12,
                                        width: "100%",
                                        textAlign: "center"
                                    }}>
                                        {emotion}
                                    </span>
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                </DialogActions>
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
                        Regenerate <b>{character.name}</b> with emotion <b>{confirmEmotion}</b>?
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {confirmEmotion && EMOTION_PROMPTS[confirmEmotion]}
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
                            setOpen(false);
                            if (onRegenerate && confirmEmotion) {
                                onRegenerate(character, confirmEmotion);
                            }
                        }}
                    >Yes</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default CharacterButton;