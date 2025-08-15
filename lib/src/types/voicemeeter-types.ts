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

export interface AudioCallbackInfo {
    sampleRate: number;
    samplesPerFrame: number;
}

export interface AudioCallbackBuffer {
    sampleRate: number;
    samplesPerFrame: number;
    numInputs: number;
    numOutputs: number;
    inputs: Float32Array[];
    outputs: Float32Array[];
}

export interface BaseAudioCallbackArg {
    lpUser: Buffer | null;
    nnn: number;
}

export interface AudioCallbackInfoArg extends BaseAudioCallbackArg {
    command: "starting" | "change" | "ending";
    data: AudioCallbackInfo;
}

export interface AudioCallbackBufferArg extends BaseAudioCallbackArg {
    command: "buffer_in" | "buffer_out" | "buffer_main";
    data: AudioCallbackBuffer;
}

export type AudioCallbackArg = AudioCallbackInfoArg | AudioCallbackBufferArg;
