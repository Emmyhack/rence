export class SafeAppProvider {
	constructor(..._args: unknown[]) {}
	request(): Promise<never> {
		return Promise.reject(new Error('Safe App Provider not available in this environment'));
	}
	on(): void {}
	removeListener(): void {}
}

export default class SafeAppsSDK {
	safe = {
		async getInfo(): Promise<null> {
			return null;
		},
	};
	constructor(..._args: unknown[]) {}
}