/* eslint-disable unicorn/prefer-top-level-await */
// eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
const { AudioCallbackCommands, AudioCallbackModes, Voicemeeter } = require("voicemeeter-connector");

void Voicemeeter.init().then(async (vm) => {
    // Connect to your voicemeeter client
    vm.connect();

    // Simple factory function which handles shared errors and some logging for start/stop events
    const audioCallbackFactory = (callback) => {
        return (error, event) => {
            if (error !== null) {
                console.error(error, event === undefined ? undefined : JSON.stringify(event));
                return;
            }
            if (event === undefined) {
                console.error("[CALLBACK] Audio callback received no event data.");
                return;
            }
            // Logs the info events
            if (event.command === AudioCallbackCommands.STARTING) {
                console.log("[CALLBACK] Callback has started.");
            }
            if (event.command === AudioCallbackCommands.CHANGE) {
                console.log("[CALLBACK] Change in audio stream.");
            }
            if (event.command === AudioCallbackCommands.ENDING) {
                console.log("[CALLBACK] Callback has stopped.");
            }
            // Call the defined callback
            callback(event);
        };
    };

    const sleep = (ms) => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    };

    /* 
        Utility function that just tries out an audio callback for 10s. Can be for several modes
    */
    const tryAudioCallback = async (mode, clientName, callback) => {
        const modes = Array.isArray(mode) ? mode : [mode];
        for (const callbackMode of modes) {
            vm.registerAudioCallback(callbackMode, clientName, callback);
        }
        console.log("Starting audio callback...");
        await vm.startAudioCallback();

        await sleep(10_000);
        // Stopping the audio callback is done automatically when unregistering a callback, so this isn't really necessary.
        console.log("Stopping audio callback...");
        await vm.stopAudioCallback();

        const unregisterPromises = [];
        for (const callbackMode of modes) {
            unregisterPromises.push(vm.unregisterAudioCallback(callbackMode));
        }
        await Promise.all(unregisterPromises);
    };

    /*
        Since the VB-Audio Callback system lets you process/change the audio signal, there are a lot of possible use cases.
        Below are some very basic callback examples, some other examples not implemented here are:
        - Analysing the audio, for example: performing an FFT to get the frequency spectrum, 
        - Monitor the audio level in real-time, instead of relying on .getLevel()
        - Audio effects, gates, fades, noise filter
        - etc... 
    
        Additionally it's important to be aware of the channel assignment and how many physical/virtual strips each voicemeeter version has.
        e.g. Voicemeeter (the base version) has 12 channels (see the inputChannelCountMap property on the vm instance), where the first 4 channels are physical,
        and channels 4-11 are virtual.
        If you'd want to mute all physical strips, you need to know how many physical strips each version has to get the channel range.
        See the audio callback section in VoicemeeterRemoteAPI.pdf, or the section above VBVMR_AudioCallbackRegister in VoicemeeterRemote.h
        on the SDK github: https://github.com/vburel2018/Voicemeeter-SDK
    
        Each audio stream (BUFFER_IN, BUFFER_OUT and BUFFER_MAIN) can only be registered once. Possibly from 3 different applications.
    */

    // ===================== Start of callback examples =====================

    // Mutes the output of any callback
    const simpleFullMute = () => {
        // Since outputSignal isn't assigned any values here, it'll just contain zeroes and the output signal will be silent
    };

    // Mute specific channels, here just the first physical strip and the first bus
    const MUTE_STRIP_CHANNELS = new Set([0, 1]);
    const MUTE_BUS_CHANNELS = new Set([0, 1, 2, 3, 4, 5, 6, 7]);

    const muteSpecificChannels = (event) => {
        // BUFFER_IN for the strips
        if (event.command === AudioCallbackCommands.BUFFER_IN) {
            const { inputChannels, samplesPerFrame, outputChannels } = event.data;
            for (const [ch, inputChannel] of inputChannels.entries()) {
                // Don't copy audio signal if it should be muted
                if (MUTE_STRIP_CHANNELS.has(ch)) {
                    continue;
                }
                for (let i = 0; i < samplesPerFrame; i++) {
                    outputChannels[ch][i] = inputChannel[i];
                }
            }
        }

        // BUFFER_OUT for the buses
        if (event.command === AudioCallbackCommands.BUFFER_OUT) {
            const { inputChannels, samplesPerFrame, outputChannels } = event.data;
            for (const [ch, inputChannel] of inputChannels.entries()) {
                // Don't copy audio signal if it should be muted
                if (MUTE_BUS_CHANNELS.has(ch)) {
                    continue;
                }
                for (let i = 0; i < samplesPerFrame; i++) {
                    outputChannels[ch][i] = inputChannel[i];
                }
            }
        }
    };

    // Swaps the channels of the first 2 output devices
    const swapTwoOutputDevices = (event) => {
        if (event.command === AudioCallbackCommands.BUFFER_OUT) {
            const { inputChannels, samplesPerFrame, outputChannels } = event.data;
            // Takes the first 8 input channels, and copies the signal to the output channels 8-15
            for (const [ch, inputChannel] of inputChannels.slice(0, 8).entries()) {
                const outputChannel = outputChannels[ch + 8];
                for (let i = 0; i < samplesPerFrame; i++) {
                    outputChannel[i] = inputChannel[i];
                }
            }
            // Takes the input channels 8-15, and copies them to the output channels 0-7
            for (const [ch, inputChannel] of inputChannels.slice(8, 16).entries()) {
                const outputChannel = outputChannels[ch];
                for (let i = 0; i < samplesPerFrame; i++) {
                    outputChannel[i] = inputChannel[i];
                }
            }
        }
    };

    // Record audio signal of the first bus
    const recordedSamples = Array.from({ length: 8 }, () => []);

    const recordOutputChannel = (event) => {
        if (event.command === AudioCallbackCommands.STARTING) {
            console.log("Recording started");
        }
        if (event.command === AudioCallbackCommands.BUFFER_OUT) {
            const { inputChannels, samplesPerFrame, outputChannels } = event.data;
            // Store the samples of the first 8 channels, and passthrough the signal
            for (const [ch, inputChannel] of inputChannels.slice(0, 8).entries()) {
                for (let i = 0; i < samplesPerFrame; i++) {
                    recordedSamples[ch].push(inputChannel[i]);
                    outputChannels[ch][i] = inputChannel[i];
                }
            }
            // Directly passthrough audio signal
            for (const [ch, inputChannel] of inputChannels.slice(8).entries()) {
                for (let i = 0; i < samplesPerFrame; i++) {
                    outputChannels[ch + 8][i] = inputChannel[i];
                }
            }
        }
        if (event.command === AudioCallbackCommands.ENDING) {
            console.log("Recording finished. Total samples:", recordedSamples[0].length);
        }
    };

    // Output recorded audio signal to first bus
    let playbackPosition = 0;
    const playRecordedAudio = (event) => {
        if (event.command === AudioCallbackCommands.STARTING) {
            playbackPosition = 0;
        }

        if (event.command === AudioCallbackCommands.BUFFER_OUT) {
            const { samplesPerFrame, outputChannels, inputChannels } = event.data;

            for (const [ch, inputChannel] of inputChannels.slice(0, 8).entries()) {
                for (let i = 0; i < samplesPerFrame; i++) {
                    const sampleIndex = playbackPosition + i;
                    const recordedSample = sampleIndex < recordedSamples[ch].length ? recordedSamples[ch][sampleIndex] : 0;
                    // Clamp the value to avoid clipping
                    const mixedSample = Math.max(-1, Math.min(1, inputChannel[i] + recordedSample));
                    outputChannels[ch][i] = mixedSample;
                }
            }
            // Directly passthrough audio signal
            for (const [ch, inputChannel] of inputChannels.slice(8).entries()) {
                for (let i = 0; i < samplesPerFrame; i++) {
                    outputChannels[ch + 8][i] = inputChannel[i];
                }
            }
            playbackPosition += samplesPerFrame;
        }
    };

    console.log("==== Muting all audio ====");
    await tryAudioCallback(AudioCallbackModes.MAIN, "Audio muter", audioCallbackFactory(simpleFullMute));

    // Here the same callback is used for BUFFER_IN and BUFFER_OUT
    console.log("==== Muting specific audio channels ====");
    await tryAudioCallback(
        [AudioCallbackModes.INPUT, AudioCallbackModes.OUTPUT],
        "Channel muter",
        audioCallbackFactory(muteSpecificChannels)
    );

    console.log("==== Swapping output device channels ====");
    await tryAudioCallback(AudioCallbackModes.OUTPUT, "Device swapper", audioCallbackFactory(swapTwoOutputDevices));

    console.log("==== Recording audio from first bus ====");
    await tryAudioCallback(AudioCallbackModes.OUTPUT, "Output recorder", audioCallbackFactory(recordOutputChannel));

    console.log("==== Playing recorded audio ====");
    await tryAudioCallback(AudioCallbackModes.OUTPUT, "Audio playbacker", audioCallbackFactory(playRecordedAudio));

    console.log("Disconnecting voicemeeter.");
    vm.disconnect();
});
