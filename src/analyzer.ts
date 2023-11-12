import {PackageInfo, PackageInfoMap} from "./index.js";

export interface PackageAnalysisResults {
	packages: PackageAnalysisResult[],
	numberOfFindings: number
}
export interface PackageAnalysisResult {
	packageInfo: PackageInfo
	messages: string[]
}

export async function analyzePackages(packages: PackageInfoMap): Promise<PackageAnalysisResults> {
	console.log(`Analyzing ${packages.size} packages`);

	const findings: PackageAnalysisResult[] = [];
	let numberOfFindings = 0;
	for (const pkg of packages.values()) {
		const res = await analyzePackage(pkg);
		findings.push(res);
		if (res.messages.length) {
			numberOfFindings++;
		}
	}
	return {
		packages: findings,
		numberOfFindings
	};
}

export async function analyzePackage(packageInfo: PackageInfo): Promise<PackageAnalysisResult> {
	const messages = checkInstallScripts(packageInfo);
	return {
		packageInfo,
		messages
	};
}

function checkInstallScripts(pkg: PackageInfo): string[] {
	// Also see https://github.com/naugtur/can-i-ignore-scripts/discussions/13
	const installScripts = ["preinstall", "install", "postinstall", "preuninstall", "postuninstall"];
	const {packageJson} = pkg;
	if (!packageJson.scripts) {
		return [];
	}
	const messages: string[] = [];
	for (const scriptName in packageJson.scripts) {
		if (installScripts.includes(scriptName)) {
			messages.push(`Contains "${scriptName}" script executing: ${packageJson.scripts[scriptName]}`);
		}
	}
	return messages;
}
