import test from 'ava';
import VoiceMeeter from './VoicemeeterConnector';
import { BusProperties, StripProperties } from './VoicemeeterConsts';

var defaultGain: any;

VoiceMeeter.init().then(vm => {
	test('Voicemeeter Init', t => {
		if (vm) t.pass();
	});

	test('Voicemeeter Connect', t => {
		vm.connect();
		t.log('Login Completed');
		t.pass();
	});

	test('Connection error', t => {
		let vmTest = new VoiceMeeter();
		const error = t.throws(() => {
			vmTest.connect();
		});
		t.is(error.message, 'Await the initialisation before connect');
	});

	test('Update Device List', t => {
		vm.updateDeviceList();
		if (vm.inputDevices.length > 0 && vm.outputDevices.length > 0) {
			t.pass();
		}
	});

	test('Get Bus Parameter', t => {
		defaultGain = vm.getBusParameter(0, BusProperties.Gain);
		if (typeof defaultGain === 'number') {
			t.pass();
		}
	});

	test('Get Strip Parameter', t => {
		defaultGain = vm.getStripParameter(0, StripProperties.Gain);
		if (typeof defaultGain === 'number') {
			t.pass();
		}
	});

	test('Set Bus Parameter', t => {
		vm.setStripParameter(1, StripProperties.Gain, '-15');
		t.pass();
	});
});
