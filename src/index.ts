import path from "node:path";
import {readFile} from "node:fs/promises";
import {NormalizedPackageJson, readPackageUp} from "read-package-up";
import {getPackagesFromInstalledDependencies} from "./installedDepsHandler.js";
import mapWorkspaces from "@npmcli/map-workspaces";
import {getPackagesFromLockfile} from "./lockfileHandler.js";
import {analyzePackages} from "./analyzer.js";

export type ModulePath = string;
export interface PackageManifest extends NormalizedPackageJson {}

export interface PackageInfo {
	packageJson: NormalizedPackageJson,
	modulePath: ModulePath
}

export type PackageInfoMap = Map<ModulePath, PackageInfo>;

export interface PackageAnalysisRequest {
	cwd: string,
	ignorePackages: string[]
}

/*
 * Downloads all tarballs specified in the lockfile
 */
export async function analyzeLockfile({cwd, ignorePackages}: PackageAnalysisRequest) {
	const rootPackageInfo = await getRootPackage(cwd);

	let lockfile = await tryReadJson(path.join(rootPackageInfo.modulePath, `package-lock.json`));
	let packageLock = true;
	if (!lockfile) {
		// If no package-lock.json is available, try npm-shrinkwrap.json
		lockfile = await tryReadJson(path.join(rootPackageInfo.modulePath, `npm-shrinkwrap.json`));
		packageLock = false;
	}
	if (!lockfile) {
		throw new Error(
			`The lockfile based analysis requires a lockfile to be present. ` +
			`However, neither a package-lock.json nor an npm-shrinkwrap.json ` +
			`file could be found at ${rootPackageInfo.modulePath}.`);
	}
	console.log(`Analyzing ${packageLock ? "package-lock.json" : "npm-shrinkwrap.json"} ` +
		`of package "${rootPackageInfo.packageJson.name}" and fetching packages from the registry...`);
	const packages = await getPackagesFromLockfile(rootPackageInfo, lockfile);
	removeIgnoredPackages(packages, ignorePackages);
	return await analyzePackages(packages);
}

export async function analyzePackageJson({cwd, ignorePackages}: PackageAnalysisRequest) {
	const rootPackageInfo = await getRootPackage(cwd);
	console.log(`Analyzing package.json of package "${rootPackageInfo.packageJson.name}" ` +
		`and locally installed dependencies...`);
	const packages = await getPackagesFromInstalledDependencies(rootPackageInfo);

	// Check for workspace config
	if (rootPackageInfo.packageJson.workspaces) {
		const workspacePaths = await mapWorkspaces({
			cwd,
			pkg: rootPackageInfo.packageJson
		});
		if (workspacePaths.size) {
			// Read packages in workspaces concurrently
			const paths = Array.from(workspacePaths.values());
			await Promise.all(paths.map(async (workspacePath: string) => {
				const workspacePackageInfo = await getRootPackage(workspacePath);
				const workspacePackages = await getPackagesFromInstalledDependencies(workspacePackageInfo);
				workspacePackages.forEach((pkgInfo, modulePath) => {
					if (!packages.has(modulePath)) {
						packages.set(modulePath, pkgInfo);
					}
				});
			}));
		}
	}

	removeIgnoredPackages(packages, ignorePackages);
	return await analyzePackages(packages);
}

async function getRootPackage(cwd: string) : Promise<PackageInfo>{
	const root = await readPackageUp({
		cwd,
		normalize: true
	});
	if (!root) {
		throw new Error(`Failed to find package.json for module at ${cwd}`);
	}
	return {
		packageJson: root.packageJson,
		modulePath: path.dirname(root.path)
	};
}

async function tryReadJson(jsonPath: string) {
	try {
		const content = await readFile(jsonPath, {encoding: "utf8"});
		return JSON.parse(content);
	} catch (err: unknown) {
		// if (err instanceof NodeJS.ErrnoException &&
		// 	(err as NodeJS.ErrnoException).code === "ENOENT") { // "File or directory does not exist"
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((err as any).code === "ENOENT") { // "File or directory does not exist"
			return null;
		} else {
			throw err;
		}
	}
}

function removeIgnoredPackages(packages: PackageInfoMap, ignorePackages: string[]) {
	const foundIgnoredPackages = new Set<string>();
	if (ignorePackages && ignorePackages.length) {
		for (const [modulePath, packageInfo] of packages.entries()) {
			if (ignorePackages.includes(packageInfo.packageJson.name)) {
				packages.delete(modulePath);
				foundIgnoredPackages.add(packageInfo.packageJson.name);
			}
		}
		ignorePackages.forEach((ignoredPackageName) => {
			if (!foundIgnoredPackages.has(ignoredPackageName)) {
				throw new Error(`Failed to find ignored package: ${ignoredPackageName}`);
			}
		});
	}
	console.log(`(ignoring ${foundIgnoredPackages.size} packages)`);
}
