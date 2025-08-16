import * as constants from "./lib/constants";

const { BusProperties, InterfaceTypes, StripProperties, MacroButtonModes, AudioCallbackModes, AudioCallbackCommands } = constants;

export { AudioCallbackCommands, AudioCallbackModes, BusProperties, InterfaceTypes, MacroButtonModes, StripProperties };

export { default as Voicemeeter } from "./lib/voicemeeter-connector";
export * as types from "./types/voicemeeter-types";
