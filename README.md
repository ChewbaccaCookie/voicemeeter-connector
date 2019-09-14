# Voicemeeter Connector

Voicemeeter Connector is a Typescript / Node.js connector to use the official VoicemeeterRemoteAPI of [Voicemeeter](https://www.vb-audio.com/Voicemeeter/index.htm) or [Voicemeeter Banana](https://www.vb-audio.com/Voicemeeter/banana.htm). The official API is available [here](https://download.vb-audio.com/Download_CABLE/VoicemeeterRemoteAPI.pdf). 

## Usage

### Installation

`$ npm i voicemeeter-connector`



### Use it in your project

```javascript
import Voicemeeter from "voicemeeter-connector";

Voicemeeter.init().then(vm => {
    // Connect to your Voicemeeter client
    vm.connect(); 
    
   	// Get Gain of strip 0 
    let gain = vm.getStripParameter(0, StripProperties.Gain);
   	
    // Sets gain of strip 0 to -10db
    vm.setStripParameter(0, StripProperties.Gain, - 10);
    
});
```

**Strip** = Inputs (left side of voicemeeter)

**Bus** = Outputs (right side of voicemeeter)

## Documetation
See Documentation on [https://warhunter45.github.io/voicemeeter-connector/](https://warhunter45.github.io/voicemeeter-connector/)
