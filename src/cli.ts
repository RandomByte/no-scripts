import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import path from "node:path";
import {analyzeLockfile, analyzePackageJson} from "./index.js";
import {writeToConsole} from "./formatter.js";
import {PackageAnalysisResults} from "./analyzer.js";

await yargs(hideBin(process.argv))
	.parserConfiguration({
		"parse-numbers": false
	})
	.scriptName("no-scripts")
	.command({
		command: "$0 [projectDir]",
		desc: "Check lockfile",
		builder: (yargs) => {
			yargs
				.positional("projectDir", {
					describe: "Project directory to scan. Defaults to the current working directory",
					type: "string",
				});
		},
		handler: async (argv) => {
			const cwd = argv.projectDir? path.resolve(argv.projectDir) : process.cwd();
			const lockfileResults = await analyzeLockfile({cwd, ignorePackages: argv.ignore || []});
			let packageJsonResult: PackageAnalysisResults | undefined;
			if (argv.includeLocal) {
				console.log("");
				packageJsonResult = await analyzePackageJson({cwd, ignorePackages: argv.ignore || []});
			}
			console.log("");
			writeToConsole(lockfileResults, packageJsonResult);

			if (lockfileResults.numberOfFindings || (packageJsonResult && packageJsonResult.numberOfFindings)) {
				process.exit(1);
			}

		}
	})
	.option("ignore", {
		describe: "Package names to ignore",
		array: true,
		string: true,
	})
	.option("include-local", {
		describe: "Extend check to include local dependencies",
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
	})
	.parse();
