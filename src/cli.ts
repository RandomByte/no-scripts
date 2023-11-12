import {lockfile, packageJson} from "./index.js";
import {writeToConsole} from "./formatter.js";
import {PackageAnalysisResults} from "./analyzer.js";

let result: PackageAnalysisResults;
if (process.argv[2] && process.argv[2] === "package-json") {
	result = await packageJson({cwd: process.cwd()});
} else {
	result = await lockfile({cwd: process.cwd()});
}

writeToConsole(result);

if (result.numberOfFindings) {
	process.exit(1);
}
