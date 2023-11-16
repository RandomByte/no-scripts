import {PackageAnalysisResults} from "./analyzer.js";

export function writeToConsole(
	lockfileResults: PackageAnalysisResults,
	packageJsonResults: PackageAnalysisResults | undefined
) {
	for (const packageResult of lockfileResults.packages) {
		if (packageResult.messages.length) {
			console.log(`Findings for package ${packageResult.packageInfo.packageJson.name}:`);
			for (const msg of packageResult.messages) {
				console.log(`  ${msg}`);
			}
			console.log("");
		}
	}
	console.log(`${lockfileResults.numberOfFindings} Findings`);

	if (packageJsonResults) {
		console.log("");
		console.log("------------------------");
		console.log("Local results:");
		for (const packageResult of packageJsonResults.packages) {
			if (packageResult.messages.length) {
				console.log(`Findings for package ${packageResult.packageInfo.packageJson.name}:`);
				for (const msg of packageResult.messages) {
					console.log(`  ${msg}`);
				}
				console.log("");
			}
		}
		console.log(`${packageJsonResults.numberOfFindings} Findings`);
	}
}
