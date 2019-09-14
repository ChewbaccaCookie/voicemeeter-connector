import { getDLLPath } from './DLLHandler';
import { tLibVM, voiceMeeterTypes, Device } from '../types/VoicemeeterDLL';

import ffi from 'ffi';
import refArray from 'ref-array';
import { StripProperties, BusProperties } from './VoicemeeterConsts';
const CharArray = refArray('char'),
	LongArray = refArray('long'),
	FloatArray = refArray('float');

var libVM: tLibVM;
var instance: VoiceMeeter;

export default class VoiceMeeter {
	isInitialised = false;
	isConnected = false;
	outputDevices = [] as Device[];
	inputDevices = [] as Device[];
	version = '';
	type = '' as voiceMeeterTypes;
	eventPool = [] as (() => any)[];

	/**
	 * Initializes the voice meeter dll connection.
	 * This call is neccessary to use the api. It returns a promise with a VoiceMeeter instance
	 */
	static init() {
		return new Promise(async (resolve: (instance: VoiceMeeter) => any) => {
			if (!instance) {
				instance = new VoiceMeeter();
			}
			libVM = ffi.Library((await getDLLPath()) + '/VoicemeeterRemote64.dll', {
				VBVMR_Login: ['long', []],
				VBVMR_Logout: ['long', []],
				VBVMR_RunVoicemeeter: ['long', ['long']],
				VBVMR_IsParametersDirty: ['long', []],
				VBVMR_GetParameterFloat: ['long', [CharArray, FloatArray]],
				VBVMR_GetParameterStringA: ['long', [CharArray, CharArray]],
				VBVMR_SetParameters: ['long', [CharArray]],
				VBVMR_Output_GetDeviceNumber: ['long', []],
				VBVMR_Output_GetDeviceDescA: ['long', ['long', LongArray, CharArray, CharArray]],
				VBVMR_Input_GetDeviceNumber: ['long', []],
				VBVMR_Input_GetDeviceDescA: ['long', ['long', LongArray, CharArray, CharArray]],
				VBVMR_GetVoicemeeterType: ['long', [LongArray]],
				VBVMR_GetVoicemeeterVersion: ['long', [LongArray]]
			});
			instance.isInitialised = true;
			resolve(instance);
		});
	}

	/**
	 * Starts a connection to VoiceMeeter
	 */
	public login = () => {
		if (!this.isInitialised) {
			throw new Error('Await the initialisation before login');
		}
		if (this.isConnected) {
			return;
		}
		if (libVM.VBVMR_Login() == 0) {
			this.isConnected = true;
			this.type = this.getVoicemeeterType();
			this.version = this.getVoicemeeterVersion();
			setInterval(this.checkPropertyChange, 10);
			return;
		}
		this.isConnected = false;
		throw new Error('Connection failed');
	};

	/**
	 * Terminates the connection to VoiceMeeter
	 */
	public logout = () => {
		if (!this.isConnected) {
			throw new Error('Not connected ');
		}
		if (libVM.VBVMR_Logout() == 0) {
			this.isConnected = false;
			return;
		}
		throw 'Logout failed';
	};

	/**
	 * Updates all input and ouput devices
	 */
	public updateDeviceList = () => {
		if (!this.isConnected) {
			throw new Error('Not connected ');
		}
		this.outputDevices = [];
		this.inputDevices = [];
		const outputDeviceNumber = libVM.VBVMR_Output_GetDeviceNumber();
		for (let i = 0; i < outputDeviceNumber; i++) {
			let hardwareIdPtr = new CharArray(256) as any;
			let namePtr = new CharArray(256) as any;
			let typePtr = new LongArray(1) as any;

			libVM.VBVMR_Output_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
			this.outputDevices.push({
				name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ''),
				hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ''),
				type: typePtr[0]
			});
		}

		const inputDeviceNumber = libVM.VBVMR_Input_GetDeviceNumber();
		for (let i = 0; i < inputDeviceNumber; i++) {
			let hardwareIdPtr = new CharArray(256) as any;
			let namePtr = new CharArray(256) as any;
			let typePtr = new LongArray(1) as any;

			libVM.VBVMR_Input_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
			this.inputDevices.push({
				name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ''),
				hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ''),
				type: typePtr[0]
			});
		}
	};

	/**
	 * Checks whether properties has been changed and calls all event listeners
	 */
	private checkPropertyChange = () => {
		if (this.isParametersDirty() === 1) {
			this.eventPool.forEach(eventListener => {
				eventListener();
			});
		}
	};

	/**
	 * Gets installed voicemeeter type.
	 * Means Voicemeeter or Voicemeeter Banana
	 */
	private getVoicemeeterType = (): voiceMeeterTypes => {
		let typePtr = new LongArray(1);
		if (libVM.VBVMR_GetVoicemeeterType(typePtr) !== 0) throw 'running failed';
		switch (typePtr[0]) {
			case 1: // Voicemeeter
				return 'voicemeeter';
			case 2: // Voicemeeter Banana
				return 'voicemeeterBanana';
			default:
				throw new Error('Voicemeeter seems not to be installed');
		}
	};

	/**
	 * Returns the installed voicemeeter version
	 */
	private getVoicemeeterVersion = () => {
		const versionPtr = new LongArray(1) as any;
		if (libVM.VBVMR_GetVoicemeeterVersion(versionPtr) !== 0) {
			throw 'running failed';
		}
		return versionPtr;
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
		return this.getParameter('Bus', index, property);
	};

	/**
	 * Gets a strip parameter
	 * @param  {number} index Index of the strip
	 * @param  {StripProperties} property Property which should be get
	 */
	public getStripParameter = (index: number, property: StripProperties) => {
		return this.getParameter('Strip', index, property);
	};

	/**
	 * Gets a parameter of voicemeeter
	 * @param  {'Strip'|'Bus'} selector Strip or Bus
	 * @param  {number} index Number of strip or bus
	 * @param  {StripProperties|BusProperties} property Property which should be read
	 */
	private getParameter = (selector: 'Strip' | 'Bus', index: number, property: StripProperties | BusProperties) => {
		let parameterName = `${selector}[${index}].${property}`;
		if (!this.isConnected) {
			throw new Error('Not correct connected ');
		}
		var hardwareIdPtr = new Buffer(parameterName.length + 1);
		hardwareIdPtr.write(parameterName);
		var namePtr = new FloatArray(1);
		libVM.VBVMR_GetParameterFloat(hardwareIdPtr, namePtr);
		return namePtr[0];
	};

	/**
	 * Sets a parameter of a strip.
	 * @param  {number} index Strip number
	 * @param  {StripProperties} property Propertyname which should be changed
	 * @param  {any} value Property value
	 */
	public setStripParameter = (index: number, property: StripProperties, value: any) => {
		this.setParameter('Strip', index, property, value);
	};

	/**
	 * Sets a parameter of a bus.
	 * @param  {number} index Bus number
	 * @param  {StripProperties} property Propertyname which should be changed
	 * @param  {any} value Property value
	 */
	public setBusParameter = (index: number, property: BusProperties, value: any) => {
		this.setParameter('Bus', index, property, value);
	};

	/**
	 * Sets a parameter of a bus or Strip
	 * @param  {'Strip'|'Bus'} selector
	 * @param  {number} index Number of strip or bus
	 * @param  {StripProperties|BusProperties} property Propertyname which should be changed
	 * @param  {any} value Property value
	 */
	private setParameter = (selector: 'Strip' | 'Bus', index: number, property: StripProperties | BusProperties, value: any) => {
		if (!this.isConnected) {
			throw new Error('Not connected ');
		}
		let scriptString = `${selector}[${index}].${property}=${value};`;
		const script = new Buffer(scriptString.length + 1);
		script.fill(0);
		script.write(scriptString);
		libVM.VBVMR_SetParameters(script);
	};

	/**
	 * @param  {()=>any} fn Function which should be called if something changes
	 */
	public attachChangeEvent = (fn: () => any) => {
		this.eventPool.push(fn);
	};
}
