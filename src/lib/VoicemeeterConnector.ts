/* eslint-disable no-control-regex */
import koffi from "koffi";
import DLLHandler from "./DLLHandler";
import { Device, VMLibrary, VoiceMeeterTypes } from "../types/VoicemeeterTypes";
import { BusProperties, StripProperties } from "./VoicemeeterConsts";

/**
 * @ignore
 */
let libVM: VMLibrary;
/**
 * @ignore
 */
let instance: Voicemeeter;

export default class Voicemeeter {
	/**
	 * Initializes the voice meeter dll connection.
	 * This call is neccessary to use the api. It returns a promise with a VoiceMeeter instance
	 */
	public static async init(): Promise<Voicemeeter> {
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
			};

			instance.isInitialised = true;
			resolve(instance);
		});
	}

	private isInitialised = false;
	private isConnected = false;
	private outputDevices: Device[] = [];
	private inputDevices: Device[] = [];
	private version = "";
	private type: VoiceMeeterTypes;
	private eventPool = [] as Array<() => void>;
	private stringParameters = ["Label", "FadeTo", "FadeBy", "AppGain", "AppMute", "name", "ip"];

	/**
	 * Starts a connection to VoiceMeeter
	 */
	public connect = () => {
		if (!this.isInitialised) {
			throw new Error("Await the initialisation before connect");
		}
		if (this.isConnected) {
			return;
		}
		if (libVM.VBVMR_Login() === 0) {
			this.isConnected = true;
			this.type = this.getVoicemeeterType();
			this.version = this.getVoicemeeterVersion();
			setInterval(this.checkPropertyChange, 10);
			return;
		}
		this.isConnected = false;
		throw new Error("Connection failed");
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
			if (libVM.VBVMR_Logout() === 0) {
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
				name: namePtr.toString().replace(/\u0000+$/g, ""),
				hardwareId: hardwareIdPtr.toString().replace(/\u0000+$/g, ""),
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
				name: namePtr.toString().replace(/\u0000+$/g, ""),
				hardwareId: hardwareIdPtr.toString().replace(/\u0000+$/g, ""),
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
			return String.fromCharCode
				.apply(null, strPtr)
				.split("")
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
		return new Promise((resolve) => setTimeout(resolve, 200));
	};

	/**
	 * Checks whether properties has been changed and calls all event listeners
	 */
	private checkPropertyChange = () => {
		if (this.isParametersDirty() === 1) {
			this.eventPool.forEach((eventListener) => {
				eventListener();
			});
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
			case 1: // Voicemeeter
				return "voicemeeter";
			case 2: // Voicemeeter Banana
				return "voicemeeterBanana";
			case 3: // Voicemeeter Potato
				return "voicemeeterPotato";
			default:
				throw new Error("Voicemeeter seems not to be installed");
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
			`${(versionPtr[0] & 0xff000000) >> 24}` +
			`.${(versionPtr[0] & 0x00ff0000) >> 16}` +
			`.${(versionPtr[0] & 0x0000ff00) >> 8}` +
			`.${versionPtr[0] & 0x000000ff}`;
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
