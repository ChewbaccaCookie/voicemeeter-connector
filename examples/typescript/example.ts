import { types } from "voicemeeter-connector";
import { AudioCallbackCommands, AudioCallbackModes, MacroButtonModes, StripProperties, Voicemeeter } from "voicemeeter-connector";

const vm = await Voicemeeter.init();
// Connect to your voicemeeter client
vm.connect();

// Sets gain of strip 0 to -10db
await vm.setStripParameter(0, StripProperties.Gain, -10);

// Get gain at -10db
console.log(vm.getStripParameter(0, StripProperties.Gain));

// Set gain to random number
await vm.setStripParameter(0, StripProperties.Gain, -Math.round(Math.random() * 40) + 10);

// Get random gain of strip 0
console.log(vm.getStripParameter(0, StripProperties.Gain));

// Disable VBAN
await vm.setOption("vban.Enable=0;");

// Get vban state
console.log(vm.getOption("vban.Enable"));

// Gets current audio levels of strip 0
console.log(`Left: ${vm.getLevel(0, 0)} Right: ${vm.getLevel(0, 1)}`);

// set MacroButton state
console.log(vm.setMacroButtonStatus(0, 1, MacroButtonModes.DEFAULT));

// get MacroButton state
console.log(vm.getMacroButtonStatus(0, MacroButtonModes.DEFAULT));

vm.attachChangeEvent(() => {
    console.log("Something changed!");
});

// VB-Audio Callback example:

// Index at which the first bus output starts in inputChannels
let inputOffset = 0;
switch (vm.$type) {
    case "voicemeeter": {
        inputOffset = 12;
        break;
    }
    case "voicemeeterBanana": {
        inputOffset = 22;
        break;
    }
    default: {
        inputOffset = 34;
        break;
    }
}

// This callback just passes through the audio signal to the output channels, without any changes
const simplePassthroughCallback = (arg: types.AudioCallbackArg) => {
    if (arg.command === AudioCallbackCommands.BUFFER_MAIN) {
        const { outputChannels, inputChannels, samplesPerFrame } = arg.data;
        for (const [ch, outputChannel] of outputChannels.entries()) {
            for (let i = 0; i < samplesPerFrame; i++) {
                outputChannel[i] = inputChannels[inputOffset + ch][i];
            }
        }
    }
    if (arg.command === AudioCallbackCommands.STARTING) {
        console.log(`Started audio callback with sampleRate: ${arg.data.sampleRate}`);
    }
    if (arg.command === AudioCallbackCommands.ENDING) {
        console.log("Stopped audio callback");
    }
};

// Register the audio callback
vm.registerAudioCallback(AudioCallbackModes.MAIN, simplePassthroughCallback, "ConnectorApp", undefined, (error, arg) => {
    // Log any error that occured in the callback
    console.error(error, arg === undefined ? "With arg not defined" : `With arg ${arg}`);
});

// Start the audio callback
vm.startAudioCallback();

// Stop the audio callback after 5s
setTimeout(() => {
    console.log("Unregistering audio callback");
    vm.unregisterAudioCallback(AudioCallbackModes.MAIN);
}, 5000);

// Disconnect voicemeeter client
setTimeout(() => {
    vm.disconnect();
    process.exit(0);
}, 20_000);
