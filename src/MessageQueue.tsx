import React, {useEffect, useRef, useState} from 'react';
import { Typography, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

export interface MessageQueueHandle {
    addLoadingMessage: (promise: Promise<any>, message?: string) => void;
}

export interface MessageQueueProps {
    register?: (handle: MessageQueueHandle) => void;
    borderColor: string;
}

export const MessageQueue: React.FC<MessageQueueProps> = ({ register , borderColor}) => {
    const [messages, setMessages] = useState<{ id: number; message: string }[]>([]);

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
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 19,
            }}
        >
        <AnimatePresence>
            {messages.map(({ id, message }, index) => (
                <motion.div
                    key={`message_${id}`}
                    layout={false}
                    style={{
                        position: 'fixed',
                        top: index * 48,
                        left: 0,
                        display: 'flex',
                        flexDirection: "row",
                        alignItems: "center",
                        borderRadius: 23,
                        backgroundColor: "#333",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        border: `3px solid ${borderColor}`,
                        zIndex: 20,
                        pointerEvents: 'none',
                    }}
                    initial={{ opacity: 0, y: 8, width: 40 }}
                    animate={{ opacity: 1, y: 0, width: "auto" }}
                    exit={{ opacity: 0, y: -8, width: 40 }}
                    transition={{ duration: 0.3 }}
                >
                    <CircularProgress size={40} thickness={4} />
                    <Typography color="text.primary" sx={{ marginX: 1, fontWeight: 600, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        {message}
                    </Typography>
                </motion.div>
            ))}
        </AnimatePresence>
        </div>
    );
};