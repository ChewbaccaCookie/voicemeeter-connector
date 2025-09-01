/* eslint-disable no-control-regex */
import koffi from "koffi";

import {
    AudioCallbackBuffer,
    AudioCallbackEvent,
    AudioCallbackFunction,
    AudioCallbackInfo,
    AudioCallbackState,
    Device,
    VBVMR_T_AUDIOBUFFER,
    VBVMR_T_AUDIOINFO,
    VMLibrary,
    VoiceMeeterTypes,
} from "../types/voicemeeter-types";
import {
    AudioBufferStruct,
    AudioCallbackCommands,
    AudioCallbackModes,
    AudioInfoStruct,
    BusProperties,
    InitialAudioCallbackState,
    MacroButtonModes,
    StripProperties,
} from "./constants";
import DLLHandler from "./dll-handler";

/**
 * @ignore
 */
let libVM: VMLibrary;
/**
 * @ignore
 */
let audioCallbackProtoPointer: koffi.IKoffiCType;
/**
 * @ignore
 */
let instance: Voicemeeter;

export default class Voicemeeter {
    /**
     * Initializes the voice meeter dll connection.
     * This call is neccessary to use the api. It returns a promise with a VoiceMeeter instance
     */
    static init = async (): Promise<Voicemeeter> => {
        const dllPath = await DLLHandler.getDLLPath();

        return new Promise((resolve: (instance: Voicemeeter) => any) => {
            if (!instance) {
                instance = new Voicemeeter();
            }
            const lib = koffi.load(`${dllPath}/VoicemeeterRemote64.dll`);

            libVM = {
                VBVMR_Login: lib.func("long __stdcall VBVMR_Login(void)"),
                VBVMR_Logout: lib.func("long __stdcall VBVMR_Logout(void)"),
                VBVMR_RunVoicemeeter: lib.func("long __stdcall VBVMR_RunVoicemeeter(long mode)"),
                VBVMR_IsParametersDirty: lib.func("long __stdcall VBVMR_IsParametersDirty(void)"),
                VBVMR_GetLevel: lib.func("long __stdcall VBVMR_GetLevel(long type, long channel, _Out_ float* value)"),
                VBVMR_GetParameterFloat: lib.func("long __stdcall VBVMR_GetParameterFloat(const char* param, _Out_ float* value)"),
                VBVMR_GetParameterStringA: lib.func("long __stdcall VBVMR_GetParameterStringA(const char* param, _Out_ char* value)"),
                VBVMR_SetParameters: lib.func("long __stdcall VBVMR_SetParameters(const char* param)"),
                VBVMR_Output_GetDeviceNumber: lib.func("long __stdcall VBVMR_Output_GetDeviceNumber(void)"),
                VBVMR_Output_GetDeviceDescA: lib.func(
                    "long __stdcall VBVMR_Output_GetDeviceDescA(long index, _Out_ long* type, _Out_ char* name, _Out_ char* hardwareId)"
                ),
                VBVMR_Input_GetDeviceNumber: lib.func("long __stdcall VBVMR_Input_GetDeviceNumber(void)"),
                VBVMR_Input_GetDeviceDescA: lib.func(
                    "long __stdcall VBVMR_Input_GetDeviceDescA(long index, long* type, char* name, char* hardwareId)"
                ),
                VBVMR_GetVoicemeeterType: lib.func("long __stdcall VBVMR_GetVoicemeeterType(_Out_ long* type)"),
                VBVMR_GetVoicemeeterVersion: lib.func("long __stdcall VBVMR_GetVoicemeeterVersion(_Out_ long* version)"),
                VBVMR_MacroButton_IsDirty: lib.func("long __stdcall VBVMR_MacroButton_IsDirty(void)"),
                VBVMR_MacroButton_GetStatus: lib.func(
                    "long __stdcall VBVMR_MacroButton_GetStatus(long nuLogicalButton, _Out_ float* pValue, long bitmode)"
                ),
                VBVMR_MacroButton_SetStatus: lib.func(
                    "long __stdcall VBVMR_MacroButton_SetStatus(long nuLogicalButton, float fValue, long bitmode)"
                ),
                VBVMR_AudioCallbackRegister: lib.func(
                    "long __stdcall VBVMR_AudioCallbackRegister(long mode, void* audioCallback, void* lpUser, char* szClientName)"
                ),
                VBVMR_AudioCallbackStart: lib.func("long __stdcall VBVMR_AudioCallbackStart(void)"),
                VBVMR_AudioCallbackStop: lib.func("long __stdcall VBVMR_AudioCallbackStop(void)"),
                VBVMR_AudioCallbackUnregister: lib.func("long __stdcall VBVMR_AudioCallbackUnregister(void* audioCallback)"),
            };

            audioCallbackProtoPointer = koffi.pointer(
                koffi.proto("long __stdcall AudioCallback(void* lpUser, long nCommand, void* lpData, long nnn)")
            );

            instance.isInitialised = true;
            resolve(instance);
        });
    };

    private isInitialised = false;
    private isConnected = false;
    private outputDevices: Device[] = [];
    private inputDevices: Device[] = [];
    private version = "";
    private type: VoiceMeeterTypes;
    private eventPool = [] as Array<() => void>;
    private stringParameters = ["Label", "FadeTo", "FadeBy", "AppGain", "AppMute", "name", "ip"];
    private timerInterval: NodeJS.Timeout;
    private audioCallbackStates: Record<AudioCallbackModes, AudioCallbackState> = {
        [AudioCallbackModes.MAIN]: { ...InitialAudioCallbackState },
        [AudioCallbackModes.INPUT]: { ...InitialAudioCallbackState },
        [AudioCallbackModes.OUTPUT]: { ...InitialAudioCallbackState },
    };
    private awaitAudioCallbackEvents: { start: Array<() => void>; stop: Array<() => void> } = {
        start: [],
        stop: [],
    };

    /**
     * Starts a connection to VoiceMeeter
     */
    public connect = (): { success: boolean; message: string; code: number } | never => {
        if (!this.isInitialised) {
            throw new Error("Await the initialisation before connect");
        }
        if (this.isConnected) {
            // If already connected, still return success status instead of throwing
            return { success: true, message: "Already connected.", code: 0 };
        }

        const loginResult = libVM.VBVMR_Login();

        switch (loginResult) {
            case 0: {
                // Complete success, Voicemeeter is running
                this.isConnected = true;
                this.type = this.getVoicemeeterType();
                this.version = this.getVoicemeeterVersion();
                this.timerInterval = setInterval(this.checkPropertyChange, 10);
                return { success: true, message: "Successfully connected to VoiceMeeter (VM Running).", code: 0 };
            }
            case 1: {
                // Connected successfully but Voicemeeter application is not running
                // Pipe is established, can wait for VM to start
                this.isConnected = true;
                this.type = undefined;
                this.version = "Unknown";
                this.timerInterval = setInterval(this.checkPropertyChange, 10);
                return { success: true, message: "Connected to VoiceMeeter API (VM App Not Running).", code: 1 };
            }
            case -1: {
                // Failed to get client (unexpected error) - throw error
                this.isConnected = false;
                throw new Error("VoiceMeeter connection failed: Unable to get client (Unexpected error -1).");
            }
            case -2: {
                // Unexpected login (logout should have been executed first) - throw error
                this.isConnected = false;
                throw new Error("VoiceMeeter connection failed: Unexpected login (Expected logout first -2).");
            }
            default: {
                // Unknown return value - throw error
                this.isConnected = false;
                throw new Error(`VoiceMeeter connection failed with unknown error code: ${loginResult}.`);
            }
        }
    };

    /**
     * Getter $outputDevices
     * @return {Device[] }
     */
    public get $outputDevices(): Device[] {
        return this.outputDevices;
    }

    /**
     * Getter $inputDevices
     * @return {Device[] }
     */
    public get $inputDevices(): Device[] {
        return this.inputDevices;
    }

    /**
     * Getter $version
     * @return {string }
     */
    public get $version(): string {
        return this.version;
    }

    /**
     * Getter $type
     * @return {VoiceMeeterTypes}
     */
    public get $type(): VoiceMeeterTypes {
        return this.type;
    }

    /**
     * Terminates the connection to VoiceMeeter
     */
    public disconnect = () => {
        if (!this.isConnected) {
            throw new Error("Not connected ");
        }
        try {
            this.unregisterAllAudioCallbacks().catch(() => {});
            if (libVM.VBVMR_Logout() === 0) {
                clearInterval(this.timerInterval);
                this.isConnected = false;
                return;
            }
            throw new Error("Disconnect failed");
        } catch {
            throw new Error("Disconnect failed");
        }
    };

    /**
     * Updates all input and ouput devices
     */
    public updateDeviceList = () => {
        if (!this.isConnected) {
            throw new Error("Not connected ");
        }
        this.outputDevices = [];
        this.inputDevices = [];
        const outputDeviceNumber = libVM.VBVMR_Output_GetDeviceNumber();
        for (let i = 0; i < outputDeviceNumber; i++) {
            const hardwareIdPtr = Buffer.alloc(256);
            const namePtr = Buffer.alloc(256);
            const typePtr = [0];

            libVM.VBVMR_Output_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
            this.outputDevices.push({
                name: namePtr.toString().replaceAll(/\u0000+$/g, ""),
                hardwareId: hardwareIdPtr.toString().replaceAll(/\u0000+$/g, ""),
                type: typePtr[0],
            });
        }

        const inputDeviceNumber = libVM.VBVMR_Input_GetDeviceNumber();
        for (let i = 0; i < inputDeviceNumber; i++) {
            const hardwareIdPtr = Buffer.alloc(256);
            const namePtr = Buffer.alloc(256);
            const typePtr = [0];

            libVM.VBVMR_Input_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
            this.inputDevices.push({
                name: namePtr.toString().replaceAll(/\u0000+$/g, ""),
                hardwareId: hardwareIdPtr.toString().replaceAll(/\u0000+$/g, ""),
                type: typePtr[0],
            });
        }
    };

    /**
     * Returns wheter a parameter has been changed
     */
    public isParametersDirty = () => {
        return libVM.VBVMR_IsParametersDirty();
    };

    /**
     * Gets a bus parameter.
     * @param  {number} index Index of the bus
     * @param  {BusProperties} property Property which should be get
     */

    public getBusParameter = (index: number, property: BusProperties) => {
        return this.getParameter("Bus", index, property);
    };

    /**
     * Gets a strip parameter
     * @param  {number} index Index of the strip
     * @param  {StripProperties} property Property which should be get
     */
    public getStripParameter = (index: number, property: StripProperties) => {
        return this.getParameter("Strip", index, property);
    };

    /**
     * Sets a parameter of a strip.
     * @param  {number} index Strip number
     * @param  {StripProperties} property Propertyname which should be changed
     * @param  {any} value Property value
     */
    public setStripParameter = (index: number, property: StripProperties, value: any) => {
        return this.setParameter("Strip", index, property, value);
    };

    /**
     * Sets a parameter of a bus.
     * @param  {number} index Bus number
     * @param  {StripProperties} property Propertyname which should be changed
     * @param  {any} value Property value
     */
    public setBusParameter = (index: number, property: BusProperties, value: any) => {
        return this.setParameter("Bus", index, property, value);
    };

    /**
     * @param  {()=>any} fn Function which should be called if something changes
     */
    public attachChangeEvent = (fn: () => any) => {
        this.eventPool.push(fn);
    };
    /**
     * @param parameterName Name of the parameter that should be get
     * @returns {any} Parameter value
     */
    public getOption = (parameterName: string) => {
        if (!this.isConnected) {
            throw new Error("Not correct connected ");
        }
        // Some parameters return string values and require some post-processing, this checks for those parameters
        if (this.stringParameters.some((str) => parameterName.includes(str))) {
            const strPtr = Buffer.alloc(512);
            libVM.VBVMR_GetParameterStringA(parameterName, strPtr);
            return [...String.fromCharCode.apply(null, strPtr)]
                .filter((e: string) => {
                    return e !== "\0";
                })
                .join("");
        }
        const valuePtr = [0];
        libVM.VBVMR_GetParameterFloat(parameterName, valuePtr);
        return valuePtr[0];
    };
    /**
     * Sets an option.
     * @param {string} option Option to set
     */
    public setOption = (option: string) => {
        const script = Buffer.alloc(option.length + 1);
        script.fill(0).write(option);
        libVM.VBVMR_SetParameters(script);
        return new Promise((resolve) => {
            setTimeout(resolve, 200);
        });
    };

    /**
     * Checks if any macro button has unsaved changes
     */
    public isMacroButtonDirty = () => {
        return libVM.VBVMR_MacroButton_IsDirty();
    };

    /**
     * Gets the status of a specific macro button
     * @param {number} buttonIndex - The index of the macro button
     * @param {number} [bitmode=0] - Bit mode parameter (optional, defaults to MacroButtonModes.DEFAULT)
     * @returns {number} The current status value of the macro button
     * @throws {Error} Throws an error if failed to get the button status
     */
    public getMacroButtonStatus = (buttonIndex: number, bitmode: number = MacroButtonModes.DEFAULT): number => {
        const valuePtr = [0];
        const result = libVM.VBVMR_MacroButton_GetStatus(buttonIndex, valuePtr, bitmode);
        if (result === 0) {
            return valuePtr[0];
        }
        throw new Error(`Failed to get macro button ${buttonIndex} status`);
    };

    /**
     * Sets the status of a specific macro button
     * @param {number} buttonIndex - The index of the macro button
     * @param {number} value - The status value to set
     * @param {number} [bitmode=0] - Bit mode parameter (optional, defaults to MacroButtonModes.DEFAULT)
     * @throws {Error} Throws an error if failed to set the button status
     */
    public setMacroButtonStatus = (buttonIndex: number, value: number, bitmode: number = MacroButtonModes.DEFAULT): void => {
        const result = libVM.VBVMR_MacroButton_SetStatus(buttonIndex, value, bitmode);
        if (result !== 0) {
            throw new Error(`Failed to set macro button ${buttonIndex} status`);
        }
    };

    /**
     * The amount of input channels per voicemeeter version
     */
    public static inputChannelCountMap: Record<Exclude<VoiceMeeterTypes, undefined>, number> = {
        voicemeeter: 12,
        voicemeeterBanana: 22,
        voicemeeterPotato: 34,
    };

    /**
     * The amount of output channels per voicemeeter version
     */
    public static outputChannelCountMap: Record<Exclude<VoiceMeeterTypes, undefined>, number> = {
        voicemeeter: 16,
        voicemeeterBanana: 40,
        voicemeeterPotato: 64,
    };

    /**
     * Registers an audio callback function to process/change real time audio stream data from Voicemeeter.
     * @description For more detailed info about the audio callback system, see the Voicemeeter Remote API pdf and VoicemeeterRemote.h on https://github.com/vburel2018/Voicemeeter-SDK
     * @param {AudioCallbackModes} mode - The audio callback type. See {@link AudioCallbackModes}
     * @param {string} clientName - Name of the application registering the callback (max 64 ASCII chars)
     * @param {AudioCallbackFunction} callback - Function called for each audio stream event.
     * The first argument is an Error if one occurs, otherwise null. The second argument provides the decoded audio event.
     * @param {Object} [config] - Optional configuration object.
     * @param {Buffer} [config.lpUser] - Optional user context pointer passed to the callback.
     * @param {boolean} [config.restartOnChangedStream=true] - If true, automatically restarts the callback when the audio stream changes. Defaults to true
     * @throws {Error} Throws an error if the callback is already registered, or if registration fails.
     */
    public registerAudioCallback = (
        mode: AudioCallbackModes,
        clientName: string,
        callback: AudioCallbackFunction,
        config?: {
            lpUser?: Buffer;
            restartOnChangedStream?: boolean;
        }
    ): void => {
        if (this.audioCallbackStates[mode].pointer !== null) {
            throw new Error(`Audio callback for "${mode}" is already registered.`);
        }

        this.audioCallbackStates[mode].pointer = koffi.register(
            (lpUser: Buffer, nCommand: number, lpData: unknown, nnn: number): number => {
                let audioCallbackEvent: AudioCallbackEvent | undefined;

                try {
                    switch (nCommand) {
                        case AudioCallbackCommands.STARTING: {
                            this.audioCallbackStates[mode].ended = false;
                            audioCallbackEvent = { lpUser, nnn, command: nCommand, data: this.convertToAudioCallbackInfo(lpData) };
                            this.resolveAudioCallbackEvent("start");
                            break;
                        }
                        case AudioCallbackCommands.ENDING: {
                            this.audioCallbackStates[mode].ended = true;
                            audioCallbackEvent = { lpUser, nnn, command: nCommand, data: this.convertToAudioCallbackInfo(lpData) };
                            this.resolveAudioCallbackEvent("stop");
                            break;
                        }
                        case AudioCallbackCommands.CHANGE: {
                            audioCallbackEvent = { lpUser, nnn, command: nCommand, data: this.convertToAudioCallbackInfo(lpData) };
                            /*
                                CHANGE occurs when the main audio stream, sample rate or buffer size has changed.
                                the audio callback is stopped by voicemeeter when this happens,
                                See: https://github.com/vburel2018/Voicemeeter-SDK/blob/3be2c1c36563afbd6df3da8436406c77d2cc1f10/example0/vmr_client.c#L718
                                This is just an exact copy of the implentation there.
                            */
                            if (config?.restartOnChangedStream ?? true) {
                                setTimeout(() => {
                                    this.startAudioCallback().catch((unknownError) => {
                                        const error = this.convertToErrorObject(unknownError);
                                        error.message = "Failed to restart callback after changed stream: " + error.message;
                                        callback(error, audioCallbackEvent);
                                    });
                                }, 50);
                            }
                            break;
                        }
                        case AudioCallbackCommands.BUFFER_IN:
                        case AudioCallbackCommands.BUFFER_OUT:
                        case AudioCallbackCommands.BUFFER_MAIN: {
                            audioCallbackEvent = { lpUser, nnn, command: nCommand, data: this.convertToAudioCallbackBuffer(lpData) };
                            break;
                        }
                        default: {
                            return 0;
                        }
                    }

                    // If the stream has stopped, check if any unregisters are scheduled to resolve their promises
                    if (
                        nCommand === AudioCallbackCommands.ENDING &&
                        this.audioCallbackStates[mode].awaitUnregister.length > 0 &&
                        this.audioCallbackStates[mode].pointer !== null
                    ) {
                        koffi.unregister(this.audioCallbackStates[mode].pointer);
                        this.audioCallbackStates[mode].pointer = null;
                        while (this.audioCallbackStates[mode].awaitUnregister.length > 0) {
                            const resolve = this.audioCallbackStates[mode].awaitUnregister.shift();
                            if (resolve !== undefined) {
                                resolve();
                            }
                        }
                    }
                } catch (unknownError: unknown) {
                    const error = this.convertToErrorObject(unknownError);
                    callback(error, audioCallbackEvent);
                    return 0;
                }
                callback(null, audioCallbackEvent);
                return 0;
            },
            audioCallbackProtoPointer
        );

        const clientNamePtr = Buffer.alloc(64);
        clientNamePtr.write(clientName);

        const result = libVM.VBVMR_AudioCallbackRegister(
            mode,
            this.audioCallbackStates[mode].pointer,
            config?.lpUser ?? null,
            clientNamePtr
        );

        switch (result) {
            case 0: {
                return;
            }
            case -1: {
                throw new Error("Failed to register audio callback");
            }
            // VoicemeeterRemote.h says this case should have result = 1, but in reality this appears to be -2
            case -2: {
                const outClientName = clientNamePtr.toString().replace("/\u0000+$/g", "");
                throw new Error(`Audio callback already registered by: ${outClientName}`);
            }
            default: {
                throw new Error(`Unexpected result registering audio callback: ${result}`);
            }
        }
    };

    /**
     * Starts the audio stream to the audio callback.
     * @returns {Promise<void>} Resolves when started, rejects with Error if failed.
     */
    public startAudioCallback = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            const result = libVM.VBVMR_AudioCallbackStart();
            if (result === 0) {
                this.awaitAudioCallbackEvents.start.push(() => resolve());
                return;
            }

            let errorReason: string;
            switch (result) {
                case -1: {
                    errorReason = "Failed to start audio callback";
                    break;
                }
                case -2: {
                    errorReason = "No audio callback registered";
                    break;
                }
                default: {
                    errorReason = `Unexpected result starting audio callback ${result}`;
                }
            }
            reject(new Error(errorReason));
        });
    };

    /**
     * Stops the audio stream to the audio callback.
     * @returns {Promise<void>} Resolves when stopped, rejects with Error if failed.
     */
    public stopAudioCallback = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            const result = libVM.VBVMR_AudioCallbackStop();
            if (result === 0) {
                this.awaitAudioCallbackEvents.stop.push(() => resolve());
                return;
            }

            let errorReason: string;
            switch (result) {
                case -1: {
                    errorReason = "Failed to stop audio callback";
                    break;
                }
                case -2: {
                    errorReason = "No audio callback registered";
                    break;
                }
                default: {
                    errorReason = `Unexpected result stopping audio callback: ${result}`;
                    break;
                }
            }
            reject(errorReason);
        });
    };

    /**
     * Unregisters the audio callback.
     * @description Internally voicemeeter automatically calls stopAudioCallback(), so it's not strictly necessary to stop and then unregister.
     * @param {AudioCallbackModes} mode - The audio callback type. See {@link AudioCallbackModes}
     * @returns {Promise<void>} Resolves when unregistered, rejects with Error if failed.
     */
    public unregisterAudioCallback = (mode: AudioCallbackModes): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (this.audioCallbackStates[mode].pointer === null) {
                reject(new Error(`No audio callback registered for "${mode}"`));
                return;
            }

            const result = libVM.VBVMR_AudioCallbackUnregister(this.audioCallbackStates[mode].pointer);
            switch (result) {
                case 0: {
                    // It is not safe to unregister when the callback hasn't ended, wait for ENDING first
                    if (this.audioCallbackStates[mode].ended) {
                        koffi.unregister(this.audioCallbackStates[mode].pointer);
                        this.audioCallbackStates[mode].pointer = null;
                        resolve();
                    } else {
                        // Wait for ENDING first
                        this.audioCallbackStates[mode].awaitUnregister.push(() => resolve());
                    }
                    return;
                }
                case -1: {
                    reject(new Error("Failed to unregister audio callback"));
                    break;
                }
                case -2: {
                    // -2 means the callback has already been unregistered, this case shouldn't occur
                    this.audioCallbackStates[mode].pointer = null;
                    resolve();
                    break;
                }
                default: {
                    reject(new Error(`Unexpected result unregistering audio callback ${result}`));
                }
            }
        });
    };

    /**
     * Unregisters all registered audio callbacks.
     * @returns {Promise<void[]>} Resolves when all callbacks are unregistered.
     */
    public unregisterAllAudioCallbacks = (): Promise<void[]> => {
        const promises: Array<Promise<void>> = [];
        for (const [mode, state] of Object.entries(this.audioCallbackStates)) {
            if (state.pointer === null) {
                continue;
            }
            promises.push(this.unregisterAudioCallback(<AudioCallbackModes>(<unknown>mode)));
        }
        return Promise.all(promises);
    };

    /**
     * Resolves all pending promises for a given audio callback event type.
     * @param {"start"|"stop"} type - The event type to resolve ('start' or 'stop').
     */
    private resolveAudioCallbackEvent(type: "start" | "stop"): void {
        while (this.awaitAudioCallbackEvents[type].length > 0) {
            const resolve = this.awaitAudioCallbackEvents[type].shift();
            if (resolve !== undefined) {
                resolve();
            }
        }
    }

    /**
     * Converts raw callback data to an AudioCallbackInfo object.
     * @param {unknown} lpData - Raw data pointer from Voicemeeter.
     * @returns {AudioCallbackInfo} Decoded audio callback info.
     */
    private convertToAudioCallbackInfo = (lpData: unknown): AudioCallbackInfo => {
        const rawData = koffi.decode(lpData, AudioInfoStruct) as VBVMR_T_AUDIOINFO;
        return {
            sampleRate: rawData.samplerate,
            samplesPerFrame: rawData.nbSamplePerFrame,
        };
    };

    /**
     * Converts raw callback data to an AudioCallbackBuffer object.
     * @param {unknown} lpData - Raw data pointer from Voicemeeter.
     * @returns {AudioCallbackBuffer} Decoded audio buffer data.
     */
    private convertToAudioCallbackBuffer = (lpData: unknown): AudioCallbackBuffer => {
        const rawData = koffi.decode(lpData, AudioBufferStruct) as VBVMR_T_AUDIOBUFFER;
        const data: AudioCallbackBuffer = {
            sampleRate: rawData.audiobuffer_sr,
            samplesPerFrame: rawData.audiobuffer_nbs,
            inputChannelCount: rawData.audiobuffer_nbi,
            outputChannelCount: rawData.audiobuffer_nbo,
            inputChannels: [],
            outputChannels: [],
        };

        for (let i = 0; i < rawData.audiobuffer_nbi; i++) {
            data.inputChannels.push(new Float32Array(koffi.view(rawData.audiobuffer_r[i], rawData.audiobuffer_nbs * 4)));
        }
        for (let i = 0; i < rawData.audiobuffer_nbo; i++) {
            data.outputChannels.push(new Float32Array(koffi.view(rawData.audiobuffer_w[i], rawData.audiobuffer_nbs * 4)));
        }
        return data;
    };

    /**
     * Converts an unknown error value to an Error object.
     * @param {unknown} unknownError - An unknown error value.
     * @returns {Error} Converted Error object.
     */
    private convertToErrorObject = (unknownError: unknown): Error => {
        if (unknownError instanceof Error) {
            return unknownError;
        }
        if (typeof unknownError === "string") {
            return new Error(unknownError);
        }
        return new Error(`Unknown error: ${String(unknownError)}`);
    };

    /**
     * Checks whether properties has been changed and calls all event listeners
     */
    private checkPropertyChange = () => {
        let hasChanges = false;

        if (this.isParametersDirty() === 1) {
            hasChanges = true;
        }

        if (this.isMacroButtonDirty() === 1) {
            hasChanges = true;
        }

        if (hasChanges) {
            for (const eventListener of this.eventPool) {
                eventListener();
            }
        }
    };

    /**
     * Gets installed voicemeeter type.
     * Means Voicemeeter(normal,banana,potato)
     */
    private getVoicemeeterType = (): VoiceMeeterTypes => {
        const typePtr = [0];
        if (libVM.VBVMR_GetVoicemeeterType(typePtr) !== 0) {
            throw new Error("running failed");
        }

        switch (typePtr[0]) {
            case 1: {
                // Voicemeeter
                return "voicemeeter";
            }
            case 2: {
                // Voicemeeter Banana
                return "voicemeeterBanana";
            }
            case 3: {
                // Voicemeeter Potato
                return "voicemeeterPotato";
            }
            default: {
                throw new Error("Voicemeeter seems not to be installed");
            }
        }
    };

    /**
     * Returns the installed voicemeeter version
     */
    private getVoicemeeterVersion = () => {
        const versionPtr = [0];
        if (libVM.VBVMR_GetVoicemeeterVersion(versionPtr) !== 0) {
            throw new Error("running failed");
        }
        // For info on this see: https://github.com/mirror/equalizerapo/blob/53d885f7f1a097b457e17a5206b7d60f647877a8/VoicemeeterClient/VoicemeeterRemote.h#L122-L135
        const version =
            `${(versionPtr[0] & 0xff_00_00_00) >> 24}` +
            `.${(versionPtr[0] & 0x00_ff_00_00) >> 16}` +
            `.${(versionPtr[0] & 0x00_00_ff_00) >> 8}` +
            `.${versionPtr[0] & 0x00_00_00_ff}`;
        return version;
    };

    /**
     * Gets a parameter of voicemeeter
     * @param  {'Strip'|'Bus'} selector Strip or Bus
     * @param  {number} index Number of strip or bus
     * @param  {StripProperties|BusProperties} property Property which should be read
     */
    private getParameter = (selector: "Strip" | "Bus", index: number, property: StripProperties | BusProperties) => {
        const parameterName = `${selector}[${index}].${property}`;
        return this.getOption(parameterName);
    };

    /**
     * Sets a parameter of a bus or Strip
     * @param  {'Strip'|'Bus'} selector
     * @param  {number} index Number of strip or bus
     * @param  {StripProperties|BusProperties} property Propertyname which should be changed
     * @param  {any} value Property value
     */
    private setParameter = (
        selector: "Strip" | "Bus",
        index: number,
        property: StripProperties | BusProperties,
        value: any
    ): Promise<any> => {
        if (!this.isConnected) {
            throw new Error("Not connected ");
        }
        const scriptString = `${selector}[${index}].${property}=${value};`;
        return this.setOption(scriptString);
    };
    /**
     * Gets realtime audio level see the VoicemeeterRemote API: [VoicemeeterRemote.h GetLevel](https://github.com/mirror/equalizerapo/blob/7aece1b788fce5aa11873f3842a0d01f7c78454b/VoicemeeterClient/VoicemeeterRemote.h#L284),
     * for more details about the parameters
     * @param {0|1|2|3} type 0 = pre fader input levels. 1 = post fader input levels. 2= post Mute input levels. 3= output levels
     * @param channel audio channel zero based index
     * @returns {float} Current audio level
     */
    public getLevel = (type: 0 | 1 | 2 | 3, channel: number) => {
        const levelPtr = [0];
        libVM.VBVMR_GetLevel(type, channel, levelPtr);
        return levelPtr[0];
    };
}
