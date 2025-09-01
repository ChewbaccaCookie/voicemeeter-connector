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

/* 
    Basic VB-Audio Callback example
    more advanced examples in the example-audiocallback.js file
*/

// Index at which the first bus output starts in inputChannels (for the MAIN stream)
const offset = vm.$type === undefined ? 0 : Voicemeeter.inputChannelCountMap[vm.$type];

/*  
    This callback just passes through the output channels after output INSERT (in inputChannels), to the output channels.
    To passthrough output to output, it would be better to use BUFFER_OUT here, since you don't need the strip signal. Allowing another application to use BUFFER_MAIN
*/
const simplePassthroughCallback = (error, event) => {
    // Handle errors
    if (error !== null) {
        console.error(error, event === undefined ? undefined : JSON.stringify(event));
        return;
    }
    if (event === undefined) {
        console.error("Event data undefined.");
        return;
    }

    if (event.command === AudioCallbackCommands.BUFFER_MAIN) {
        const { outputChannels, inputChannels, samplesPerFrame } = event.data;
        for (const [ch, outputChannel] of outputChannels.entries()) {
            for (let i = 0; i < samplesPerFrame; i++) {
                outputChannel[i] = inputChannels[offset + ch][i];
            }
        }
    }
};

// Register the audio callback
vm.registerAudioCallback(AudioCallbackModes.MAIN, "Cool client name", simplePassthroughCallback);
console.log("Registered audio callback.");

// Start the audio callback
await vm.startAudioCallback().catch((error) => {
    console.error(error);
});
console.log("Started audio callback.");

// Explicitly unregister and disconnect voicemeeter client
setTimeout(async () => {
    await vm.unregisterAudioCallback(AudioCallbackModes.MAIN).catch((error) => {
        console.error(error);
    });
    console.log("Unregistered audio callback.");

    vm.disconnect();
    console.log("Disconnected voicemeeter.");
    process.exit(0);
}, 20_000);
