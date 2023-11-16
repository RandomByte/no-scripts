import {promisify} from "node:util";
import path from "node:path";
import {realpath} from "node:fs/promises";
import resolve from "resolve";
const resolveModulePath = promisify(resolve);
import {ModulePath, PackageInfo, PackageInfoMap, PackageManifest} from "./index.js";
import {readPackageJson} from "./util.js";

interface Dependency {
	packageName: string,
	optional: boolean
}

export async function getPackagesFromInstalledDependencies(packageInfo: PackageInfo): Promise<PackageInfoMap> {
	return await collectPackages(packageInfo);
}

function addDepsToArray(targetArray: Dependency[], depsToAdd: string[], optional: boolean) {
	for (const packageName of depsToAdd) {
		targetArray.push({
			packageName,
			optional
		});
	}
}

function getPackageDependencies(pkg: PackageManifest, rootPkg = false): Dependency[] {
	const deps: Dependency[] = [];

	addDepsToArray(deps, Object.keys(pkg.dependencies || {}), false);
	addDepsToArray(deps, Object.keys(pkg.optionalDependencies || {}), true);
	// TODO: Maybe add check whether peerDependenciesMeta flags it as optional
	addDepsToArray(deps, Object.keys(pkg.peerDependencies || {}), true);
	addDepsToArray(deps, Object.keys(pkg.bundleDependencies || {}), false);
	addDepsToArray(deps, Object.keys(pkg.bundledDependencies || {}), false);
	if (rootPkg) {
		// Ignore devDependencies unless for the root package
		addDepsToArray(deps, Object.keys(pkg.devDependencies || {}), false);
	}
	return deps;
}

async function getPackageJson(moduleName: string, parentDir: string): Promise<PackageInfo> {
	try {
		let packageJsonPath: string = await resolveModulePath(moduleName + "/package.json", {
			basedir: parentDir,
			preserveSymlinks: false
		});
		packageJsonPath = await realpath(packageJsonPath);
		const modulePath = path.dirname(packageJsonPath);
		return {
			packageJson: await readPackageJson(modulePath),
			modulePath
		};
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(`Failed to locate dependency ${moduleName}: ${err.message}`, {
				cause: err
			});
		} else {
			throw err;
		}
	}
}

async function collectPackages(rootPackageInfo: PackageInfo) {
	const depPackages: PackageInfoMap = new Map<ModulePath, PackageInfo>();

	async function collectDependencies(
		moduleName: string, parentPath: string, optional: boolean = false
	): Promise<undefined> {
		try {
			const res = await getPackageJson(moduleName, parentPath);
			if (depPackages.has(res.modulePath)) {
				// Deps already processed
				return;
			}
			depPackages.set(res.modulePath, res);
			await Promise.all(getPackageDependencies(res.packageJson).map(({packageName, optional}) => {
				return collectDependencies(packageName, res.modulePath, optional);
			}));
		} catch (err) {
			if (optional) {
				// Do nothing
			} else {
				throw err;
			}
		}
	}

	const rootDeps = getPackageDependencies(rootPackageInfo.packageJson, true);
	const rootModulePath = rootPackageInfo.modulePath;
	await Promise.all(rootDeps.map(({packageName, optional}) => {
		return collectDependencies(packageName, rootModulePath, optional);
	}));

	return depPackages;
}
