import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, Character, AspectRatio} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Client } from "@gradio/client";
import silhouetteUrl from './assets/silhouette.png'

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
    characterEmotion: {[key: string]: Emotion};
    characterFocus: string;
};


enum Emotion {
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

export const EMOTION_PROMPTS: {[emotion in Emotion]: string} = {
    neutral: 'calm expression',
    admiration: 'admiring expression',
    amusement: 'amusemed expression',
    anger: 'angry expression',
    annoyance: 'annoyed, dismayed expression',
    approval: 'approving expression',
    caring: 'thoughtful, caring expression',
    confusion: 'stunned, confused expression',
    curiosity: 'curious, interested expression',
    desire: 'sexy, seductive expression',
    disappointment: 'unhappy, disappointed expression',
    disapproval: 'disapproving expression',
    disgust: 'disgusted expression',
    embarrassment: 'embarrassed, blushing',
    excitement: 'excited expression',
    fear: 'terrified expression',
    gratitude: 'thankful expression',
    grief: 'depressed, sobbing expression',
    joy: 'happy, smiling',
    love: 'adorable, grinning, blushing, lovestruck expression',
    nervousness: 'nervous, uneasy expression',
    optimism: 'hopeful expression',
    pride: 'proud, haughty expression',
    realization: 'epiphany',
    relief: 'relieved expression',
    remorse: 'guilty expression',
    sadness: 'sad, upset expression, teary',
    surprise: 'pleasantly surprised expression',
}

const CHARACTER_ART_PROMPT: string = 'plain flat background, standing, full body';
const CHARACTER_NEGATIVE_PROMPT: string = 'border, ((close-up)), background elements, special effects, scene, dynamic angle, action, cut-off';



type EmotionPack = {[K in Emotion]?: string};

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
        this.chatState = chatState ?? {
            generatedPacks: {},
            generatedDescriptions: {}
        };
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
                console.log(`Emotion result: ${emotionResult}`);
                newEmotion = emotionResult.data[0].confidences.find((confidence: {label: string, score: number}) => confidence.label != 'neutral' && confidence.score > 0.2)?.label ?? newEmotion;
            } catch (except: any) {
                console.warn(`Error classifying expression, error: ${except}`);
                newEmotion = this.fallbackClassify(botMessage.content);
            }
        } else {
            newEmotion = this.fallbackClassify(botMessage.content);
        }
        console.info(`New emotion for ${this.characters[botMessage.anonymizedId]}: ${newEmotion}`);
        this.messageState.characterEmotion[botMessage.anonymizedId] = newEmotion as Emotion;
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
        console.log(this.chatState.generatedPacks);
        for (let character of Object.values(this.characters)) {
            for (let emotion of Object.values(Emotion)) {
                console.log(`${character.name} is missing ${emotion}? ${!this.chatState.generatedPacks[character.anonymizedId][emotion]}`);
            }
            console.log(`${character.name}: ${Object.values(Emotion).filter(emotion => !this.chatState.generatedPacks[character.anonymizedId][emotion]).length > 0}`);

        }
        const targetCharacter = Object.values(this.characters).find(character => {Object.values(Emotion).filter(emotion => !this.chatState.generatedPacks[character.anonymizedId][emotion]).length > 0});
        if (targetCharacter) {
            console.log('Need to generate an image');
            this.generateImage(targetCharacter, Object.values(Emotion).find(emotion => !this.chatState.generatedPacks[targetCharacter.anonymizedId][emotion]) ?? Emotion.neutral).then(() => this.generateNextImage());
        }
    }

    async generateImage(character: Character, emotion: Emotion): Promise<void> {

        if (!this.chatState.generatedDescriptions[character.anonymizedId]) {
            // Must first build a visual description for this character:
            console.log(`Generate a physical description of ${character.name}.`);
            const imageDescription = await this.generator.textGen({
                prompt: 
                    `Character Information: ${character.description}\n\n` +
                    `Instruction: The goal of this task is to digest the character information and construct a comprehensive and concise visual description of this character` +
                    `This system response will be fed directly into an image generator, which is unfamiliar with this character; ` +
                    `use tags and keywords to convey all essential details about them, ` +
                    `presenting ample character appearance notes--particularly if they seem obvious: gender, skin tone, hair style/color, physique, outfit, etc.`,
                min_tokens: 50,
                max_tokens: 200,
                include_history: true
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
                strength: 0.05
            }))?.url ?? this.chatState.generatedPacks[character.anonymizedId][Emotion.neutral];
            if (imageUrl == silhouetteUrl) {
                console.warn(`Failed to generate a ${emotion} image for ${character.name}; falling back to silhouette.`);
            }
            this.chatState.generatedPacks[character.anonymizedId][Emotion.neutral] = imageUrl;
        }
    }

    render(): ReactElement {
        return <div className="big-stacker"
                    key={'big-over-stacker'}
                    style={{
            width: '100vw',
            height: '100vh',
            display: 'grid',
            alignItems: 'stretch'
            }}>
            {Object.keys(this.messageState.characterEmotion).map(charId => {
                if(this.messageState.characterEmotion.hasOwnProperty(charId) && this.messageState.characterEmotion[charId] != null &&
                    this.chatState.generatedPacks.hasOwnProperty(charId) && this.chatState.generatedPacks[charId] != null &&
                    this.chatState.generatedPacks[charId].hasOwnProperty(this.messageState.characterEmotion[charId]) &&
                    this.chatState.generatedPacks[charId][this.messageState.characterEmotion[charId]] != null
                ) {
                    return <img
                        key={`img-${charId}-${this.messageState.characterEmotion[charId]}`}
                        style={{
                            width: '100%',
                            maxHeight: '100vh',
                            minHeight: '10px',
                            objectFit: 'contain'
                        }}
                        src={this.chatState.generatedPacks[charId][this.messageState.characterEmotion[charId]]}
                        alt={''} />
                } else {
                    return <></>
                }
            })}
        </div>;
    }

}
