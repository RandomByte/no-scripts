declare module "@npmcli/package-json" {
	export interface NormalizeResult {
		content: object
	}
	export function normalize(modulePath: string) : Promise<NormalizeResult>
}
