import {StageBase, StageResponse, InitialData, Message, Character, AspectRatio} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Client } from "@gradio/client";
import silhouetteUrl from './assets/silhouette.png'
import CharacterImage from "./CharacterImage";
import { ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ChatStateType = {
    generatedPacks:{[key: string]: EmotionPack};
    generatedDescriptions:{[key: string]: string};
}

type ConfigType = {
    artStyle?: string;
    autoGenerate?: boolean;
    selected?: {[key: string]: string} | null;
};

type InitStateType = null;

type MessageStateType = {
    backgroundUrl: string;
    characterEmotion: {[key: string]: string};
    characterFocus: string;
};

export enum Emotion {
    neutral = 'neutral',
    admiration = 'admiration',
    amusement = 'amusement',
    anger = 'anger',
    annoyance = 'annoyance',
    approval = 'approval',
    caring = 'caring',
    confusion = 'confusion',
    curiosity = 'curiosity',
    desire = 'desire',
    disappointment = 'disappointment',
    disapproval = 'disapproval',
    disgust = 'disgust',
    embarrassment = 'embarrassment',
    excitement = 'excitement',
    fear = 'fear',
    gratitude = 'gratitude',
    grief = 'grief',
    joy = 'joy',
    love = 'love',
    nervousness = 'nervousness',
    optimism = 'optimism',
    pride = 'pride',
    realization = 'realization',
    relief = 'relief',
    remorse = 'remorse',
    sadness = 'sadness',
    surprise = 'surprise',
}

export const EMOTION_MAPPING: {[emotion in Emotion]?: Emotion} = {
    admiration: Emotion.joy,
    approval: Emotion.amusement,
    caring: Emotion.neutral,
    curiosity: Emotion.neutral,
    disapproval: Emotion.disappointment,
    optimism: Emotion.gratitude,
    realization: Emotion.surprise,
    relief: Emotion.gratitude,
    remorse: Emotion.sadness
}

export const EMOTION_PROMPTS: {[emotion in Emotion]?: string} = {
    neutral: 'calm expression',
    amusement: 'subtle smirk, amused expression',
    anger: 'angry expression',
    annoyance: 'annoyed, dismayed expression',
    confusion: 'stunned, baffled, confused expression',
    desire: 'sexy, seductive expression',
    disappointment: 'unhappy, disappointed expression',
    disgust: 'disgusted expression',
    embarrassment: 'embarrassed, blushing',
    excitement: 'excited expression',
    fear: 'terrified expression',
    gratitude: 'relieved, thankful expression',
    grief: 'depressed, sobbing expression',
    joy: 'happy, smiling',
    love: 'adorable, grinning, blushing, lovestruck expression',
    nervousness: 'nervous, uneasy expression',
    pride: 'proud, haughty, puffed up expression',
    sadness: 'sad, upset expression, teary',
    surprise: 'shocked, surprised expression',
}

const CHARACTER_ART_PROMPT: string = 'plain flat background, standing, full body';
const CHARACTER_NEGATIVE_PROMPT: string = 'border, ((close-up)), background elements, special effects, scene, dynamic angle, action, cut-off';
const BACKGROUND_ART_PROMPT: string = 'unpopulated, visual novel background scenery';


type EmotionPack = {[key: string]: string};

export class Expressions extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    // Chat state:
    chatState: ChatStateType;

    // Message state:
    messageState: MessageStateType;

    // Not saved:
    pipeline: any;
    anyPack: boolean;
    autoGenerate: boolean;
    artStyle: string;
    characters: {[key: string]: Character};
    loadedPacks: {[key: string]: EmotionPack}

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const {
            characters,
            config,
            messageState,
            chatState
        } = data;

        console.log(config);

        this.characters = characters;

        // Set states or default them.
        this.messageState = messageState ?? {
            backgroundUrl: '',
            characterEmotion: {},
            characterFocus: ''
        }
        console.log(chatState);
        this.chatState = chatState ?? {
            generatedPacks: {},
            generatedDescriptions: {}
        };
        console.log(this.chatState);
        this.loadedPacks = {};
        this.anyPack = false;
        this.pipeline = null;
        this.autoGenerate = config?.autoGenerate ?? true;
        this.artStyle = config?.artStyle ?? 'Bold, visual novel style illustration, clean lines';

        // Look at characters, set up packs, and initialize values that aren't present in message/chat state
        Object.keys(this.characters).forEach((charAnonId: string) => {
            if(!characters[charAnonId].isRemoved) {
                console.log(characters[charAnonId]);

                if (characters[charAnonId]?.partial_extensions?.chub?.expressions?.expressions != null) {
                    this.loadedPacks[charAnonId] = characters[charAnonId].partial_extensions?.chub?.expressions?.expressions;
                    this.anyPack = true;
                } else if (this.chatState.generatedPacks[charAnonId]) {
                    this.anyPack = true;
                } else {
                    this.chatState.generatedPacks[charAnonId] = {};
                    this.anyPack = this.anyPack || this.autoGenerate;
                }
                if (config != null && config.selected != null
                        && config.selected?.hasOwnProperty(charAnonId)
                        && config.selected[charAnonId] != null
                        && config.selected[charAnonId] != ''
                        && config.selected[charAnonId].toLowerCase() != 'default'
                        && characters[charAnonId]?.partial_extensions.chub.alt_expressions != null
                        && config.selected[charAnonId] in characters[charAnonId]?.partial_extensions.chub.alt_expressions) {
                    this.loadedPacks[charAnonId] = characters[charAnonId].partial_extensions
                        .chub.alt_expressions[config.selected![charAnonId]].expressions;
                }
            }
        });
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        console.log("Loading");

        // Kick off auto-genned stuff
        this.generateNextImage()

        try {
            this.pipeline = await Client.connect("ravenok/emotions");
        } catch (except: any) {
            console.error(`Error loading expressions pipeline, error: ${except}`);
            return { success: true, error: null }
        }
        console.log(`Done loading: ${this.anyPack}`);
        return {
            success: this.anyPack,
            chatState: this.chatState,
            messageState: this.messageState,
            error: null
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state != null) {
            this.messageState = state
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return {
            extensionMessage: null,
            stageDirections: null,
            messageState: this.messageState,
            chatState: this.chatState,
            modifiedMessage: null,
            error: null
        };
    }

    fallbackClassify(text: string): string {
        const lowered = text.toLowerCase();
        let result = 'neutral';
        Object.values(Emotion).forEach(emotion => {
            if(lowered.includes(emotion.toLowerCase())) {
                result = emotion;
            }
        });
        return result;
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        let newEmotion = 'neutral';
        if(this.pipeline != null) {
            try {
                const emotionResult = (await this.pipeline.predict("/predict", {
                    param_0: botMessage.content,
                }))
                console.log(`Emotion result: `);
                console.log(emotionResult);
                newEmotion = emotionResult.data[0].confidences.find((confidence: {label: string, score: number}) => confidence.label != 'neutral' && confidence.score > 0.1)?.label ?? newEmotion;
            } catch (except: any) {
                console.warn(`Error classifying expression, error: ${except}`);
                newEmotion = this.fallbackClassify(botMessage.content);
            }
        } else {
            newEmotion = this.fallbackClassify(botMessage.content);
        }
        console.info(`New emotion for ${this.characters[botMessage.anonymizedId]}: ${newEmotion}`);
        this.messageState.characterEmotion[botMessage.anonymizedId] = newEmotion;
        this.messageState.characterFocus = botMessage.anonymizedId;
        this.generateBackground(this.characters[botMessage.anonymizedId]);
        return {
            extensionMessage: null,
            stageDirections: null,
            messageState: this.messageState,
            chatState: this.chatState,
            modifiedMessage: null,
            error: null
        };
    }

    async generateNextImage() {
        for (let character of Object.values(this.characters)) {
            if (Object.keys(EMOTION_PROMPTS).filter(emotion => !this.chatState.generatedPacks[character.anonymizedId][emotion]).length > 0) {
                this.generateImage(
                    character,
                    ((Object.keys(EMOTION_PROMPTS).find(emotion => !this.chatState.generatedPacks[character.anonymizedId][emotion]) as Emotion) ?? Emotion.neutral)).then(() => this.generateNextImage());
                return;
            }
        }
    }

    async generateImage(character: Character, emotion: Emotion): Promise<void> {

        if (!this.chatState.generatedDescriptions[character.anonymizedId]) {
            // Must first build a visual description for this character:
            console.log(`Generate a physical description of ${character.name}.`);
            const imageDescription = await this.generator.textGen({
                prompt: 
                    `Character Information:\n${character.personality}\n\n` +
                    `Current Instruction:\nThe goal of this task is to digest the character information and construct a comprehensive and concise visual description of this character. ` +
                    `This system response will be fed directly into an image generator, which is unfamiliar with this character; ` +
                    `use tags and keywords to convey all essential details about them, ` +
                    `presenting ample character appearance notes--particularly if they seem obvious: gender, skin tone, hair style/color, physique, outfit, etc.\n\n` +
                    `Sample Response:\nWoman, tall, youthful, dark flowing hair, dark brown hair, tanned skin, muscular, worn jeans, dark red bomber jacket, dark brown eyes, thin lips, running shoes, white tanktop.\n\n` +
                    `Sample Response:\nMan in a billowing cloak, sinister appearance, dark hair, middle-aged, hair graying at temples, sallow face, elaborate wooden staff, green gem in staff, dark robes with green highlights.\n\n` +
                    `Default Instruction:`,
                min_tokens: 50,
                max_tokens: 150,
                include_history: false
            });
            if (imageDescription?.result) {
                console.log(`Received an image description: ${imageDescription.result}`);
                this.chatState.generatedDescriptions[character.anonymizedId] = imageDescription.result;
            } else {
                return;
            }
        }
        // Must do neutral first:
        if (emotion != Emotion.neutral && !this.chatState.generatedPacks[character.anonymizedId][Emotion.neutral]) {
            emotion = Emotion.neutral;
        }
        if (emotion == Emotion.neutral) {
            console.log(`Generate ${emotion} image for ${character.name}.`)
            const imageUrl = (await this.generator.makeImage({
                prompt: `(Art style: ${this.artStyle}), (${this.chatState.generatedDescriptions[character.anonymizedId]}), (${CHARACTER_ART_PROMPT}), (${EMOTION_PROMPTS[emotion]})`,
                negative_prompt: CHARACTER_NEGATIVE_PROMPT,
                aspect_ratio: AspectRatio.WIDESCREEN_VERTICAL,
                remove_background: true
            }))?.url ?? silhouetteUrl;
            if (imageUrl == silhouetteUrl) {
                console.warn(`Failed to generate a ${emotion} image for ${character.name}; falling back to silhouette.`);
            }
            this.chatState.generatedPacks[character.anonymizedId][Emotion.neutral] = imageUrl;
        } else {
            console.log(`Generate ${emotion} image for ${character.name}.`)
            const imageUrl = (await this.generator.imageToImage({
                image: this.chatState.generatedPacks[character.anonymizedId][Emotion.neutral],
                prompt: `(Art style: ${this.artStyle}), (${this.chatState.generatedDescriptions[character.anonymizedId]}), (${CHARACTER_ART_PROMPT}), (${EMOTION_PROMPTS[emotion]})`,
                negative_prompt: CHARACTER_NEGATIVE_PROMPT,
                aspect_ratio: AspectRatio.WIDESCREEN_VERTICAL,
                remove_background: true,
                strength: 0.1
            }))?.url ?? this.chatState.generatedPacks[character.anonymizedId][Emotion.neutral];
            if (imageUrl == silhouetteUrl) {
                console.warn(`Failed to generate a ${emotion} image for ${character.name}; falling back to silhouette.`);
            }
            this.chatState.generatedPacks[character.anonymizedId][emotion] = imageUrl;
        }
    }
    
    async generateBackground(character: Character): Promise<void> {

        // Must first build a visual description for the background
        console.log(`Generate a physical description of ${character.name}.`);
        const imageDescription = await this.generator.textGen({
            prompt: 
                `Character Information:\n${character.personality}\n\n` +
                `Chat History:\n{{messages}}\n\n` +
                `Current Instruction:\nThe goal of this task is to digest the character information and construct a comprehensive and concise visual description of this current scene. ` +
                `This system response will be fed directly into an image generator, which is unfamiliar with the setting; ` +
                `use tags and keywords to convey all essential details about the location, ` +
                `presenting ample appearance notes.\n\n` +
                `Sample Response:\nDesolate wasteland, sandy, oppressively bright, glare, cracked earth, forelorn crags.\n\n` +
                `Sample Response:\nSmall-town America, charming street, quaint houses, alluring shopfronts, crisp fall folliage.\n\n` +
                `Default Instruction:`,
            min_tokens: 50,
            max_tokens: 150,
            include_history: true
        });
        if (imageDescription?.result) {
            console.log(`Received an image description: ${imageDescription.result}. Generating a background.`);
            const imageUrl = (await this.generator.makeImage({
                prompt: `(Art style: ${this.artStyle}), (${BACKGROUND_ART_PROMPT}), (${imageDescription.result})`,
                aspect_ratio: AspectRatio.WIDESCREEN_HORIZONTAL,
            }))?.url ?? '';
            if (imageUrl == '') {
                console.warn(`Failed to generate a background image.`);
            }
            this.messageState.backgroundUrl = imageDescription.result;
        } else {
            return;
        }
    }

    getCharacterEmotion(anonymizedId: string): Emotion {
        return this.messageState.characterEmotion[anonymizedId] as Emotion ?? Emotion.neutral;
    }

    getCharacterImage(anonymizedId: string, emotion: Emotion): string {
        return this.chatState.generatedPacks[anonymizedId][EMOTION_MAPPING[emotion] ?? Emotion.neutral] ?? this.chatState.generatedPacks[anonymizedId][Emotion.neutral] ?? silhouetteUrl;
    }

    render(): ReactElement {
        const count = Object.values(this.characters).filter(character => !character.isRemoved).length;
        let index = 0;
        return(
            <div className="big-stacker"
                key={'big-over-stacker'}
                style={{
                    width: '100vw',
                    height: '100vh',
                    position: 'relative',
                    alignItems: 'stretch',
                    overflow: 'visible'
                }
            }>
                <AnimatePresence>
                    {this.messageState.backgroundUrl && (
                        <motion.div
                            key={this.messageState.backgroundUrl}
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
                                borderRadius: '3vw',
                                overflow: 'hidden',
                                zIndex: 0,
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                            }}
                        >
                            <img
                                src={this.messageState.backgroundUrl}
                                alt="Background"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    filter: 'blur(3px)',
                                    borderRadius: '3vw',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                }}
                                draggable={false}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                {Object.values(this.characters).map(character => {
                    // Must have at least a neutral image in order to display this character:
                    if (!character.isRemoved && this.chatState.generatedPacks[character.anonymizedId][Emotion.neutral]) {
                        const position = ++index * (100 / (count + 1));
                        return <CharacterImage
                            character={character}
                            emotion={this.getCharacterEmotion(character.anonymizedId)}
                            xPosition={position}
                            imageUrl={this.getCharacterImage(character.anonymizedId, this.getCharacterEmotion(character.anonymizedId))}
                            isTalking={this.messageState.characterFocus == character.anonymizedId}
                        />
                    } else {
                        return <></>
                    }
                })}
            </div>
        );
    }

}
