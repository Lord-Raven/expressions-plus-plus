import {Box, Button} from "@mui/material";
import React, {useState} from "react";

interface GenerateButtonProps {
    shouldShow: () => boolean;
    onClick: () => void;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, shouldShow }) => {
    const [generating, setGenerating] = useState(false);

    if (!shouldShow() || generating) return null;

    const handleClick = async () => {
        // TODO: If character addition didn't require refreshing anyway, I would need that to reset this button.
        setGenerating(true);
        onClick();
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1300,
            }}
        >
            <Button variant="contained" color="primary" onClick={handleClick}>
                Generate Missing Emotion Images
            </Button>
        </Box>
    );
};