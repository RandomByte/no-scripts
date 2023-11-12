import {PackageAnalysisResults} from "./analyzer.js";

export function writeToConsole(results: PackageAnalysisResults) {
	for (const packageResult of results.packages) {
		if (packageResult.messages.length) {
			console.log(`Findings for package ${packageResult.packageInfo.packageJson.name}:`);
			for (const msg of packageResult.messages) {
				console.log(`  ${msg}`);
			}
			console.log("");
		}
	}
	console.log(`Findings: ${results.numberOfFindings}`);
}
