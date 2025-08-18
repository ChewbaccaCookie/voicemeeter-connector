import { IKoffiRegisteredCallback } from "koffi";

import { AudioCallbackCommands } from "../lib/constants";

export type VoiceMeeterTypes = "voicemeeter" | "voicemeeterBanana" | "voicemeeterPotato" | undefined;

export interface VMLibrary {
    VBVMR_Login: any;
    VBVMR_Logout: any;
    VBVMR_RunVoicemeeter: (voicemeeterType: any) => number;
    VBVMR_IsParametersDirty: any;
    VBVMR_GetLevel: any;
    VBVMR_GetParameterFloat: any;
    VBVMR_GetParameterStringA: any;
    VBVMR_SetParameters: any;
    VBVMR_Output_GetDeviceNumber: any;
    VBVMR_Output_GetDeviceDescA: any;
    VBVMR_Input_GetDeviceNumber: any;
    VBVMR_Input_GetDeviceDescA: any;
    VBVMR_GetVoicemeeterType: any;
    VBVMR_GetVoicemeeterVersion: (versionPtr: any) => number;
    VBVMR_MacroButton_IsDirty: any;
    VBVMR_MacroButton_GetStatus: any;
    VBVMR_MacroButton_SetStatus: any;
    VBVMR_AudioCallbackRegister: any;
    VBVMR_AudioCallbackStart: any;
    VBVMR_AudioCallbackStop: any;
    VBVMR_AudioCallbackUnregister: any;
}

export interface Device {
    name: string;
    hardwareId: string;
    type: number;
}

export interface VBVMR_T_AUDIOINFO {
    samplerate: number;
    nbSamplePerFrame: number;
}

export interface AudioCallbackInfo {
    sampleRate: number;
    samplesPerFrame: number;
}

export interface VBVMR_T_AUDIOBUFFER {
    audiobuffer_sr: number;
    audiobuffer_nbs: number;
    audiobuffer_nbi: number;
    audiobuffer_nbo: number;
    audiobuffer_r: Float32Array[];
    audiobuffer_w: Float32Array[];
}

export interface AudioCallbackState {
    pointer: IKoffiRegisteredCallback | undefined;
    pendingUnregister: boolean;
    ended: boolean;
}

export interface AudioCallbackBuffer {
    sampleRate: number;
    samplesPerFrame: number;
    inputChannelCount: number;
    outputChannelCount: number;
    inputChannels: Float32Array[];
    outputChannels: Float32Array[];
}

export interface BaseAudioCallbackArg {
    lpUser: Buffer | null;
    nnn: number;
}

export interface AudioCallbackInfoArg extends BaseAudioCallbackArg {
    command: AudioCallbackCommands.STARTING | AudioCallbackCommands.CHANGE | AudioCallbackCommands.ENDING;
    data: AudioCallbackInfo;
}

export interface AudioCallbackBufferArg extends BaseAudioCallbackArg {
    command: AudioCallbackCommands.BUFFER_IN | AudioCallbackCommands.BUFFER_OUT | AudioCallbackCommands.BUFFER_MAIN;
    data: AudioCallbackBuffer;
}

export type AudioCallbackArg = AudioCallbackInfoArg | AudioCallbackBufferArg;
