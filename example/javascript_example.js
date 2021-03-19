/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const { Voicemeeter, StripProperties } = require("../dist/voicemeeter-connector.umd");

Voicemeeter.init().then(async (vm) => {
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

	// Disconnect voicemeeter client
	vm.disconnect();
});
