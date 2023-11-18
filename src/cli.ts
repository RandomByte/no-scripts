import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import path from "node:path";
import {analyzeLockfile, analyzePackageJson} from "./index.js";
import {writeResultsToConsole} from "./formatter.js";
import {PackageAnalysisResults} from "./analyzer.js";

interface NoScriptsArg {
	projectDir: string,
	ignore: string[],
	includeLocal: boolean,
	offline: boolean,
	verbose: boolean,
}

await yargs(hideBin(process.argv))
	.parserConfiguration({
		"parse-numbers": false
	})
	.scriptName("no-scripts")
	.command<NoScriptsArg>(
		"$0 [projectDir]",
		"Checks all npm dependencies and fail if any of them define automatically executed npm lifecycle scripts",
		(yargs) => {
			yargs
				.positional("projectDir", {
					describe: "Project directory to scan. Defaults to the current working directory",
					type: "string",
				});
		},
		async (argv) => {
			const cwd = argv.projectDir? path.resolve(argv.projectDir) : process.cwd();
			let lockfileResults: PackageAnalysisResults | undefined;
			if (!argv.offline) {
				lockfileResults = await analyzeLockfile({cwd, ignorePackages: argv.ignore || []});
				writeResultsToConsole(lockfileResults);
				console.log("");
			}
			let packageJsonResult: PackageAnalysisResults | undefined;
			if (argv.includeLocal || argv.offline) {
				packageJsonResult = await analyzePackageJson({cwd, ignorePackages: argv.ignore || []});
				writeResultsToConsole(packageJsonResult);
				console.log("");

				if (argv.verbose && lockfileResults) {
					// If verbose logging is enabled, compare the analyzed sets of packages and log the differences
					console.log("Comparing analyzed package sets...");
					const lockfilePackages = new Set();
					const packageJsonPackages = new Set();
					lockfileResults.packages.forEach((packageAnalysisResult) => {
						lockfilePackages.add(packageAnalysisResult.packageName);
					});
					packageJsonResult.packages.forEach((packageAnalysisResult) => {
						packageJsonPackages.add(packageAnalysisResult.packageName);
					});
					const localOnly = new Set();
					for (const packageName of packageJsonPackages) {
						if (lockfilePackages.has(packageName)) {
							lockfilePackages.delete(packageName);
						} else {
							localOnly.add(packageName);
						}
					}
					if (lockfilePackages.size) {
						console.log(`Packages listed in lockfile but not found locally (${lockfilePackages.size}):`);
						for (const pkgName of lockfilePackages.values()) {
							console.log(`  * ${pkgName}`);
						}
						console.log("");
					} else {
						console.log(`All packages listed in the lockfile where analyzed locally too`);
					}
					if (localOnly.size) {
						console.log(`Packages found locally but not listed in lockfile (${localOnly.size}):`);
						for (const pkgName of localOnly.values()) {
							console.log(`  * ${pkgName}`);
						}
						console.log(`(this might indicate an outdated lockfile)`);
					} else {
						console.log(`All packages analyzed locally are also listed in the lockfile`);
					}
					console.log("");
				}
			}

			if (lockfileResults?.numberOfFindings || packageJsonResult?.numberOfFindings) {
				console.log("Exiting with status FAILED(1)");
				process.exit(1);
			} else {
				console.log("Exiting with status SUCCESS(0)");
			}
		}
	)
	.option("ignore", {
		describe: "Package names to ignore",
		array: true,
		string: true,
	})
	.option("include-local", {
		describe: "Extend check to include local dependencies",
		boolean: true,
	})
	.option("offline", {
		describe: "Only scan local dependencies. Implies '--include-local'",
		boolean: true,
	})
	.option("verbose", {
		describe: "Enables additional logging",
		boolean: true,
	})
	.showHelpOnFail(true)
	.strict(true)
	.fail(function(msg, err) {
		if (err) {
			console.log(`Analysis Failed:`);
			console.log(err.message);
			console.log("");
			console.log(err.stack);
		} else {
			// Yargs parsing error
			console.log(`Command failed: ${msg}`);
		}
		process.exit(1);
	})
	.parse();
