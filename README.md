# Voicemeeter Connector

Voicemeeter Connector is a Node.js (Typescript) connector to use the official VoicemeeterRemoteAPI of [Voicemeeter](https://www.vb-audio.com/Voicemeeter/index.htm),[Voicemeeter Banana](https://www.vb-audio.com/Voicemeeter/banana.htm) and [Voicemeeter Potato](https://www.vb-audio.com/Voicemeeter/potato.htm). The official API is available [here](https://download.vb-audio.com/Download_CABLE/VoicemeeterRemoteAPI.pdf).

## Installation

**Warning:** Make sure that you use Node in the Version 8 or 10.
When you try to install the dependencies on later versions the installation step will fail.

Execute the following command in a power shell window (Administrator).

`$ npm install --global --production windows-build-tools`

**Do not be surprised, the installation can take up to 15 minutes**

Now you can use the following to add the connector to your project.

`$ npm install voicemeeter-connector`

## Use it in your project

### Javascript

```javascript
const VoiceMeeter = require('voicemeeter-connector');

VoiceMeeter.default.init().then(vm => {
	// Connect to your Voicemeeter client
	vm.connect();

	// Sets gain of strip 0 to -10db
	vm.setStripParameter(0, VoiceMeeter.StripProperties.Gain, -10);

	// Get Gain of strip 0
	let gain = vm.getStripParameter(0, VoiceMeeter.StripProperties.Gain);

	//Disconnect voicemeeter client
	setTimeout(vm.disconnect, 100);
});
```

### Typescript

```typescript
import VoiceMeeter, { StripProperties } from 'voicemeeter-connector';

VoiceMeeter.init().then(vm => {
	// Connect to your voicemeeter client
	vm.connect();

	// Sets gain of strip 0 to -10db
	vm.setStripParameter(0, StripProperties.Gain, -10);

	// Get Gain of strip 0
	let gain = vm.getStripParameter(0, VoiceMeeter.StripProperties.Gain);

	//Disconnect voicemeeter client
	setTimeout(vm.disconnect, 100);
});
```

**Strip** = Inputs (left side of voicemeeter)

**Bus** = Outputs (right side of voicemeeter)

## Documetation

See Documentation on https://chewbaccacookie.github.io/voicemeeter-connector/classes/voicemeeter.html
