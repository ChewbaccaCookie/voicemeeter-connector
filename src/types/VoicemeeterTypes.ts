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
}

export interface Device {
	name: string;
	hardwareId: string;
	type: number;
}
