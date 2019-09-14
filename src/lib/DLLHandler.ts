import Registry from 'winreg';

/**
 * @ignore
 */
export async function getDLLPath(): Promise<any> {
	const regKey = new Registry({
		hive: Registry.HKLM,
		key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VB:Voicemeeter {17359A74-1236-5467}'
	});
	return new Promise(resolve => {
		regKey.values((err: any, items: any) => {
			if (err) {
				throw new Error(err);
			}
			const unistallerPath = items.find((i: any) => i.name === 'UninstallString').value;
			const fileNameIndex = unistallerPath.lastIndexOf('\\');
			resolve(unistallerPath.slice(0, fileNameIndex));
		});
	});
}
