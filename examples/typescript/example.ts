import { MacroButtonModes, StripProperties, Voicemeeter } from "voicemeeter-connector";

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

vm.registerAudioCallback(
    4,
    (arg) => {
        if (arg.command === "starting") {
            console.log(`Started audio callback with sampleRate: ${arg.data.sampleRate}`);
        }
        if (arg.command === "ending") {
            console.log("Stopped audio callback");
        }
    },
    "ConnectorApp"
);

vm.startAudioCallback();

setTimeout(() => {
    vm.unregisterAudioCallback();
    console.log("Unregistering audio callback");
}, 5000);

// Disconnect voicemeeter client
setTimeout(() => {
    vm.disconnect();
    process.exit(0);
}, 20_000);
