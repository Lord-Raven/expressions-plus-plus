import React, { useState } from "react";
import { Emotion } from "./Expressions";
import { Character } from "@chub-ai/stages-ts";

type Props = {
    character: Character;
    emotion: Emotion;
    onRegenerate: (character: Character, emotion: Emotion) => void;
    top: number;
};

const RegenerateButton: React.FC<Props> = ({ character, emotion, onRegenerate, top }) => {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div style={{
            position: "absolute",
            top: top,
            right: 20,
            zIndex: 20,
        }}>
            <button
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "none",
                    background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    padding: 0
                }}
                title={`Regenerate image for ${character.name}`}
                onClick={() => setShowConfirm(true)}
            >
                &#x21bb;
            </button>
            {showConfirm && (
                <div style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    padding: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    zIndex: 30,
                    minWidth: 120
                }}>
                    <div style={{ marginBottom: 8, fontSize: 13 }}>
                        Regenerate image for <b>{character.name}</b>?
                    </div>
                    <button
                        style={{
                            marginRight: 8,
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: "1px solid #888",
                            background: "#eee",
                            cursor: "pointer"
                        }}
                        onClick={() => {
                            setShowConfirm(false);
                            onRegenerate(character, emotion);
                        }}
                    >Yes</button>
                    <button
                        style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: "1px solid #888",
                            background: "#eee",
                            cursor: "pointer"
                        }}
                        onClick={() => setShowConfirm(false)}
                    >No</button>
                </div>
            )}
        </div>
    );
};

export default RegenerateButton;