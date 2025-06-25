import React, {useEffect, useRef, useState} from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

export interface MessageQueueHandle {
    addLoadingMessage: (promise: Promise<any>, message?: string) => void;
}

export interface MessageQueueProps {
    register?: (handle: MessageQueueHandle) => void;
}

export const MessageQueue: React.FC<MessageQueueProps> = ({ register }) => {
    const [messages, setMessages] = useState<
        { id: number; message: string }[]
    >([]);

    const idCounter = useRef(0);

    const addLoadingMessage = (promise: Promise<any>, message = 'Loading...') => {
        const id = idCounter.current++;
        setMessages((msgs) => [...msgs, { id, message }]);

        promise.finally(() =>
            setMessages((msgs) => msgs.filter((m) => m.id !== id))
        );
    };

    useEffect(() => {
        register?.({ addLoadingMessage });
        return () => register?.(undefined!);
    }, [register]);

    return (
        <AnimatePresence>
            {messages.map(({ id, message }, index) => (
                <Box
                    key={id}
                    component={motion.div}
                    sx={{
                        position: 'fixed',
                        top: 16 + index * 48,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        zIndex: 1000,
                        pointerEvents: 'none',
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                >
                    <Paper elevation={3} sx={{ padding: 1, px: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} thickness={4} />
                        <Typography variant="body2">{message}</Typography>
                    </Paper>
                </Box>
            ))}
        </AnimatePresence>
    );
};