# Voicemeeter Connector

Voicemeeter Connector is a Node.js (Typescript) connector to use the official VoicemeeterRemoteAPI of [Voicemeeter](https://www.vb-audio.com/Voicemeeter/index.htm),[Voicemeeter Banana](https://www.vb-audio.com/Voicemeeter/banana.htm) and [Voicemeeter Potato](https://www.vb-audio.com/Voicemeeter/potato.htm). The official API is available [here](https://download.vb-audio.com/Download_CABLE/VoicemeeterRemoteAPI.pdf).

## Installation

| Package Version | Node Version |
| --------------- | ------------ |
| <= 0.62         | 8,10         |
| >= 1.0          | 10 - 15      |

Execute the following command in a power shell window (Administrator).

`$ npm install --global --production windows-build-tools`

**Do not be surprised, the installation can take up to 15 minutes**

Now you can use the following to add the connector to your project.

`$ npm install voicemeeter-connector`

## Use it in your project

### Basic Example

```typescript
import { Voicemeeter, StripProperties } from "voicemeeter-connector";

Voicemeeter.init().then(async (vm) => {
	// Connect to your voicemeeter client
	vm.connect();

	// Sets gain of strip 0 to -10db
	await vm.setStripParameter(0, StripProperties.Gain, -10);

	// Print gain
	console.log(vm.getStripParameter(0, StripProperties.Gain));

	// Attach event handler
	vm.attachChangeEvent(() => {
		console.log("Something changed!");
	});

	// Disconnect voicemeeter client
	setTimeout(() => {
		vm.disconnect();
		process.exit(0);
	}, 5000);
});
```

**Strip** = Inputs (left side of voicemeeter)

**Bus** = Outputs (right side of voicemeeter)

## Documetation

See Documentation on https://chewbaccacookie.github.io/voicemeeter-connector/classes/voicemeeter.html
