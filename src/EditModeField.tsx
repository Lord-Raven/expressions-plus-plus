import React, { useRef } from "react";
import { TextField, Button, SxProps, Theme } from "@mui/material";
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import CodeIcon from '@mui/icons-material/Code';
import BorderColorOutlineIcon from '@mui/icons-material/BorderColorOutlined';
import HighlightOutlineIcon from '@mui/icons-material/HighlightOutlined';

export type EditFieldType = 'artPrompt' | 'keywords' | 'json' | 'borderColor' | 'highlightColor';

export interface EditModeFieldConfig {
    type: EditFieldType;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    visible?: boolean;
    width?: 'full' | 'small';
    customButtonSx?: SxProps<Theme>;
}

interface EditModeFieldProps {
    config: EditModeFieldConfig;
    editMode: string;
    setEditMode: (mode: string) => void;
    dialogContentRef?: React.RefObject<HTMLDivElement>;
    onFocus?: () => void;
}

const getIcon = (type: EditFieldType) => {
    switch (type) {
        case 'artPrompt':
            return <ChatBubbleOutlineIcon fontSize="small" />;
        case 'keywords':
            return <LocalOfferOutlinedIcon fontSize="small" />;
        case 'json':
            return <CodeIcon fontSize="small" />;
        case 'borderColor':
            return <BorderColorOutlineIcon fontSize="small" />;
        case 'highlightColor':
            return <HighlightOutlineIcon fontSize="small" />;
        default:
            return null;
    }
};

const getDefaultButtonSx = (type: EditFieldType, value?: string): SxProps<Theme> => {
    const baseSx: SxProps<Theme> = {
        background: '#222',
        borderRadius: 2,
        minHeight: 36,
        minWidth: 36,
        maxWidth: 36,
        p: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    return baseSx;
};

const getFieldWidth = (width: 'full' | 'small' | undefined, type: EditFieldType) => {
    if (width === 'small') {
        return { width: 120 };
    }
    return { flex: 1 };
};

export const EditModeField: React.FC<EditModeFieldProps> = ({
    config,
    editMode,
    setEditMode,
    dialogContentRef,
    onFocus
}) => {
    const fieldRef = useRef<HTMLInputElement>(null);
    let lastScrollTop = 0;

    const { type, label, value, onChange, disabled = false, visible = true, customButtonSx } = config;

    if (!visible) {
        return null;
    }

    const handleEditModeChange = () => {
        if (dialogContentRef?.current) {
            lastScrollTop = dialogContentRef.current.scrollTop;
        }
        setEditMode(type);
        setTimeout(() => {
            if (fieldRef.current) {
                fieldRef.current.focus({ preventScroll: true });
            }
            if (dialogContentRef?.current) {
                dialogContentRef.current.scrollTop = lastScrollTop;
            }
            onFocus?.();
        }, 0);
    };

    const fieldSx: SxProps<Theme> = {
        background: '#222',
        borderRadius: 2,
        fontFamily: 'monospace',
        p: 0.5,
        minHeight: 36,
        ...getFieldWidth(config.width, type),
        ...(type === 'json' && editMode === 'json' ? { mt: 1 } : {})
    };

    const buttonSx = customButtonSx || getDefaultButtonSx(type, value);

    return editMode === type ? (
        <TextField
            label={label}
            fullWidth={config.width !== 'small'}
            size="small"
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputRef={fieldRef}
            sx={fieldSx}
            variant="outlined"
        />
    ) : (
        <Button
            variant="outlined"
            color="primary"
            disabled={disabled}
            onClick={handleEditModeChange}
            sx={buttonSx}
        >
            {getIcon(type)}
        </Button>
    );
};

export default EditModeField;
