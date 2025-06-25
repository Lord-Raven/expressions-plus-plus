import React, { useState } from "react";
import {Emotion, EMOTION_PROMPTS} from "./Expressions";
import { Character } from "@chub-ai/stages-ts";
import { motion } from "framer-motion";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, IconButton
} from "@mui/material";
import { Grid } from "@mui/material";

type CharacterButtonProps = {
    character: Character;
    stage: any;
    top: number;
    onRegenerate?: (character: Character, emotion: Emotion) => void;
};

const CharacterButton: React.FC<CharacterButtonProps> = ({
    character, stage, top, onRegenerate
}) => {
    const [open, setOpen] = useState(false);
    const [confirmEmotion, setConfirmEmotion] = useState<Emotion | null>(null);

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
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    background: stage.getCharacterImage(character.anonymizedId, Emotion.neutral)
                        ? `url(${stage.getCharacterImage(character.anonymizedId, Emotion.neutral)}) center top/cover no-repeat`
                        : "#eee",
                    backgroundPosition: "center top",
                    backgroundSize: "200% 356%", // 16/9 = 1.78, so show top 9/16
                }}
                title={`Regenerate image for ${character.name}`}
                onClick={() => setOpen(true)}
            >
            </IconButton>
            {/* Emotion selection dialog */}
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>
                    <b>{character.name}</b>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Choose an image to regenerate for <b>{character.name}</b>:
                    </Typography>
                    <Grid container spacing={1}>
                        {Object.keys(EMOTION_PROMPTS).map((emotion, index) => (
                            <Grid key={emotion} component={motion.div}
                                  initial={{ opacity: 0, x: 50 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }} // staggered effect
                            >
                                <Button
                                    variant="outlined"
                                    sx={{
                                        width: 128, height: 128,
                                        p: 0,
                                        display: "flex",
                                        alignItems: "flex-end", // pushes content to the bottom vertically
                                        justifyContent: "center", // centers label horizontally
                                        borderRadius: 2,
                                        background: stage.getCharacterImage(character.anonymizedId, emotion as Emotion)
                                            ? `url(${stage.getCharacterImage(character.anonymizedId, emotion as Emotion)}) center top/cover no-repeat`
                                            : "#eee",
                                        backgroundPosition: "center top",
                                        backgroundSize: "200% 356%", // 16/9 = 1.78, so show top 9/16
                                        color: "#222",
                                        fontWeight: 600,
                                        textShadow: "0 1px 2px #fff",
                                        border: "2px solid #888"
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
                        Regenerate <b>{confirmEmotion}</b> image for <b>{character.name}</b>?
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        This may take a minute.
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