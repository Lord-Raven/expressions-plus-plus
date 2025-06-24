import { AnimatePresence, motion } from "framer-motion";
import { FC } from "react";

interface BackgroundImageProps {
    imageUrl: string;
}

const BackgroundImage: FC<BackgroundImageProps> = ({imageUrl}) => {

    return (
        <AnimatePresence>
            {imageUrl && (
                <motion.div
                    key='background'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: 'calc(50% + 5vh)', // slightly above bottom of CharacterImages
                        transform: 'translate(-50%, -60%)',
                        width: '80vw',
                        height: '80vh',
                        borderRadius: '5vw',
                        overflow: 'hidden',
                        zIndex: 0,
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    }}
                >
                    <img
                        src={imageUrl}
                        alt="Background"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'blur(1px)',
                            borderRadius: '5vw',
                            userSelect: 'none',
                            pointerEvents: 'none',
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BackgroundImage;