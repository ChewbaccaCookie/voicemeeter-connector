# 🎛️ Voicemeeter Connector (Node.js)

[![npm version](https://img.shields.io/npm/v/voicemeeter-connector.svg)](https://www.npmjs.com/package/voicemeeter-connector)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A modern Node.js (TypeScript) connector for the official [VoicemeeterRemoteAPI](https://download.vb-audio.com/Download_CABLE/VoicemeeterRemoteAPI.pdf), supporting Voicemeeter, Voicemeeter Banana, and Voicemeeter Potato. Control and automate your Voicemeeter audio mixer from JavaScript or TypeScript with ease.

---

## 🚀 Description

**Voicemeeter Connector** provides a simple, type-safe, and high-level API to interact with Voicemeeter's powerful audio routing and mixing features. It enables you to automate audio controls, monitor levels, and integrate Voicemeeter into your Node.js applications or scripts.

---

## 🎚️ Supported Voicemeeter Versions

This connector supports all major editions of Voicemeeter:

- [Voicemeeter](https://www.vb-audio.com/Voicemeeter/index.htm)
- [Voicemeeter Banana](https://www.vb-audio.com/Voicemeeter/banana.htm)
- [Voicemeeter Potato](https://www.vb-audio.com/Voicemeeter/potato.htm)

---

## 📦 Installation

```bash
npm install voicemeeter-connector
```

> **Requirements:**
>
> - Node.js >= 18
> - Windows with Voicemeeter installed (API uses native DLL)

---

## 🧑‍💻 Simple Example

```typescript
import { Voicemeeter, StripProperties } from "voicemeeter-connector";

const vm = await Voicemeeter.init();
vm.connect();
await vm.setStripParameter(0, StripProperties.Gain, -10);
console.log(vm.getStripParameter(0, StripProperties.Gain));
vm.disconnect();
```

---

## 📂 Example Overview

- **TypeScript:** [`examples/typescript/example.ts`](examples/typescript/example.ts)
- **ESM JavaScript:** [`examples/javascript-module/example.js`](examples/javascript-module/example.js)
- **CommonJS JavaScript:** [`examples/javascript-commonjs/example.js`](examples/javascript-commonjs/example.js)

Each example demonstrates connecting, setting parameters, reading values, and disconnecting.

---

## ⚙️ Usage

### Initialization

Initializes the Voicemeeter API and returns a Voicemeeter instance.

```typescript
import { Voicemeeter } from "voicemeeter-connector";
const vm = await Voicemeeter.init();
```

### Connecting

Establishes a connection to the Voicemeeter client.

```typescript
vm.connect();
```

### Setting and Getting Strip Parameters

Set or get a parameter (e.g., gain, mute) for a specific strip (input channel).

```typescript
import { StripProperties } from "voicemeeter-connector";
await vm.setStripParameter(0, StripProperties.Gain, -10);
const gain = vm.getStripParameter(0, StripProperties.Gain);
```

**StripProperties enum values:**

- `Mono`
- `Mute`
- `Solo`
- `MC`
- `Gain`
- `Pan_x`
- `Pan_y`
- `Color_x`
- `Color_y`
- `fx_x`
- `fx_y`
- `Audibility`
- `Comp`
- `Gate`
- `EqGain1`
- `EqGain2`
- `EqGain3`
- `Label`
- `A1`
- `A2`
- `A3`
- `A4`
- `A5`
- `B1`
- `B2`
- `B3`
- `FadeTo`

### Setting and Getting Bus Parameters

Set or get a parameter (e.g., gain, mute) for a specific bus (output channel).

```typescript
import { BusProperties } from "voicemeeter-connector";
await vm.setBusParameter(0, BusProperties.Gain, -5);
const busGain = vm.getBusParameter(0, BusProperties.Gain);
```

**BusProperties enum values:**

- `Mono`
- `Mute`
- `EQ`
- `Gain`
- `NormalMode`
- `AmixMode`
- `BmixMode`
- `RepeatMode`
- `CompositeMode`
- `FadeTo`
- `Label`

### Setting and Getting Options

Set or get global Voicemeeter options (e.g., enable/disable VBAN).

```typescript
await vm.setOption("vban.Enable=0;");
const vbanEnabled = vm.getOption("vban.Enable");
```

### Getting Audio Levels

Get the current audio level for a given type and channel (e.g., input/output levels).

```typescript
const leftLevel = vm.getLevel(0, 0); // type 0: pre-fader input, channel 0: left
const rightLevel = vm.getLevel(0, 1); // type 0: pre-fader input, channel 1: right
```

**getLevel type values:**

- `0`: pre-fader input levels
- `1`: post-fader input levels
- `2`: post-mute input levels
- `3`: output levels

### Macro Button Status

Get or set the status of a macro button (for automation and scripting in Voicemeeter).

```typescript
import { MacroButtonModes } from "voicemeeter-connector";
vm.setMacroButtonStatus(0, 1, MacroButtonModes.DEFAULT);
const status = vm.getMacroButtonStatus(0, MacroButtonModes.DEFAULT);
```

**MacroButtonModes enum values:**

- `DEFAULT` (0x00000000): Default mode
- `STATEONLY` (0x00000002): State only
- `TRIGGER` (0x00000003): Trigger
- `COLOR` (0x00000004): Color

### Listening for Changes

Attach a callback to be notified when any Voicemeeter parameter changes.

```typescript
vm.attachChangeEvent(() => {
  console.log("Voicemeeter state changed!");
});
```

### Device Information

Get the list of available input and output devices, Voicemeeter version, and type.

```typescript
const inputs = vm.$inputDevices;
const outputs = vm.$outputDevices;
const version = vm.$version;
const type = vm.$type;
```

### Dirty State Checks

Check if parameters or macro buttons have unsaved changes.

```typescript
const paramsDirty = vm.isParametersDirty();
const macroDirty = vm.isMacroButtonDirty();
```

### Update Device List

Refresh the list of available input and output devices.

```typescript
vm.updateDeviceList();
```

### VB-Audio Callback

Register an audio callback, start/stop and unregister.

```typescript
vm.registerAudioCallback(AudioCallbackModes.MAIN, "Your client name", someAudioCallbackFunction);
await vm.startAudioCallback();
await vm.stopAudioCallback();
await vm.unregisterAudioCallback();
```

**AudioCallbackModes enum values:**

- `INPUT` (0x00000001): Voicemeeter Input Insert 
- `OUTPUT` (0x00000002): Voicemeeter Output Insert
- `MAIN` (0x00000004): Voicemeeter Main

**Audio Callback Examples:**

- **TypeScript:** [`examples/typescript/example-audiocallback.ts`](examples/typescript/example-audiocallback.ts)
- **ESM JavaScript:** [`examples/javascript-module/example-audiocallback.js`](examples/javascript-module/example-audiocallback.js)
- **CommonJS JavaScript:** [`examples/javascript-commonjs/example-audiocallback.js`](examples/javascript-commonjs/example-audiocallback.js)

### Disconnecting

Gracefully disconnects from the Voicemeeter client.

```typescript
vm.disconnect();
```

---

## 🤝 Contribution

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or documentation improvements.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🌐 Links

- [Official Voicemeeter](https://www.vb-audio.com/Voicemeeter/index.htm)
- [API Documentation (PDF)](https://download.vb-audio.com/Download_CABLE/VoicemeeterRemoteAPI.pdf)
- [NPM Package](https://www.npmjs.com/package/voicemeeter-connector)
- [GitHub Repository](https://github.com/ChewbaccaCookie/voicemeeter-connector)
