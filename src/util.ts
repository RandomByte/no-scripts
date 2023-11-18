import PackageJson from "@npmcli/package-json";
import {PackageManifest} from "./index.js";

export async function readPackageJson(modulePath: string): Promise<PackageManifest> {
	try {
		// normalize also adds implied scripts like "node-gyp rebuild"
		// See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#default-values
		const packageJson = await PackageJson.normalize(modulePath);
		return packageJson.content as PackageManifest;
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(`Failed to parse package.json at ${modulePath}: ${err.message}`, {
				cause: err
			});
		} else {
			throw err;
		}
	}
}
