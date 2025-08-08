import React from "react";
import { Box } from "@mui/material";
import EditModeField, { EditModeFieldConfig } from "./EditModeField";

// Re-export the type for convenience
export type { EditModeFieldConfig } from "./EditModeField";

interface EditModeFieldsProps {
    fields: EditModeFieldConfig[];
    editMode: string;
    setEditMode: (mode: string) => void;
    dialogContentRef?: React.RefObject<HTMLDivElement>;
    onFocus?: () => void;
    containerSx?: object;
}

export const EditModeFields: React.FC<EditModeFieldsProps> = ({
    fields,
    editMode,
    setEditMode,
    dialogContentRef,
    onFocus,
    containerSx
}) => {
    const defaultContainerSx = {
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        alignItems: 'center',
        flexWrap: 'wrap'
    };

    return (
        <Box sx={{ ...defaultContainerSx, ...containerSx }}>
            {fields.map((field) => (
                <EditModeField
                    key={field.type}
                    config={field}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    dialogContentRef={dialogContentRef}
                    onFocus={onFocus}
                />
            ))}
        </Box>
    );
};

export default EditModeFields;
