import {promisify} from "node:util";
import path from "node:path";
import {realpath} from "node:fs/promises";
import resolve from "resolve";
const resolveModulePath = promisify(resolve);
import {ModulePath, PackageInfo, PackageInfoMap, PackageManifest} from "./index.js";
import {readPackageJson} from "./util.js";

export async function getPackagesFromInstalledDependencies(packageInfo: PackageInfo): Promise<PackageInfoMap> {
	return await collectPackages(packageInfo);
}

function getPackageDependencies(pkg: PackageManifest, rootPkg = false) {
	const deps = Object.keys(pkg.dependencies || {});
	if (pkg.optionalDependencies) {
		deps.push(...Object.keys(pkg.optionalDependencies));
	}
	if (rootPkg && pkg.devDependencies) {
		deps.push(...Object.keys(pkg.devDependencies));
	}
	return deps;
}

async function getPackageJson(moduleName: string, parentDir: string): Promise<PackageInfo> {
	try {
		let packageJsonPath = await resolveModulePath(moduleName + "/package.json", {
			basedir: parentDir,
			preserveSymlinks: false
		});
		packageJsonPath = await realpath(packageJsonPath);
		const modulePath = path.dirname(packageJsonPath);
		return {
			packageJson: await readPackageJson(modulePath),
			modulePath: modulePath
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

	async function collectDependencies(moduleName, parentPath) {
		const res = await getPackageJson(moduleName, parentPath);
		if (depPackages.has(res.modulePath)) {
			// Deps already processed
			return;
		}
		depPackages.set(res.modulePath, res);
		return await Promise.all(getPackageDependencies(res.packageJson).map((depName) => {
			return collectDependencies(depName, res.modulePath);
		}));
	}

	const rootDeps = getPackageDependencies(rootPackageInfo.packageJson, true);
	const rootModulePath = path.dirname(rootPackageInfo.modulePath);
	await Promise.all(rootDeps.map((depName) => {
		return collectDependencies(depName, rootModulePath);
	}));

	return depPackages;
}
