import path from "node:path";
import {tmpdir} from "node:os";
import {mkdir, stat} from "node:fs/promises";
import pacote from "pacote";
import {rimraf} from "rimraf";
import {PackageInfo, PackageInfoMap, PackageManifest} from "./index.js";
import {readPackageJson} from "./util.js";

export interface PackageDescriptor {
    /**
     * The version found in `package.json`
     */
	version: string,
	/**
	 * The place where the package was actually resolved from.
	 * In the case of packages fetched from the registry, this will be a url to a tarball.
	 * In the case of git dependencies, this will be the full git url with commit sha.
	 * In the case of link dependencies, this will be the location of the link target.
	 * `registry.npmjs.org` is a magic value meaning "the currently configured registry".
	 */
	resolved: string,
	/**
	 * `sha512` or `sha1` Standard Subresource Integrity string for the artifact that was unpacked in this location.
	 * For git dependencies, this is the commit sha.
	 */
	integrity: string,

	/**
	 * A flag to indicate that this is a symbolic link.  If this is present, no other fields are specified,
	 * since the link target will also be included in the lockfile.
	 */
	link: boolean,
	dev: boolean,
	optional: boolean,
	devOptional: boolean,
	/*
	 * A flag to indicate that the package is a bundled dependency.
	 */
	inBundle: boolean,
	/*
	 * A flag to indicate that the package has a `preinstall`, `install`, or `postinstall` script
	 */
	hasInstallScript: boolean,
	/*
	 * A flag to indicate that the package has an `npm-shrinkwrap.json` file.
	 */
	hasShrinkwrap: boolean,
	bin: PackageManifest["bin"],
	license: PackageManifest["license"],
	engines: PackageManifest["engines"],
	dependencies: PackageManifest["dependencies"]
	optionalDependencies: PackageManifest["optionalDependencies"]
}

type PackageLocation = string;
export interface Lockfile {
	name: string,
	version: string,
	lockfileVersion: number,
	packages: Map<PackageLocation, PackageDescriptor>
}

async function retrieveTarball(url, targetPath, cacheDir, expectedIntegrity) {
	await mkdirp(targetPath);
	await pacote.extract(url, targetPath, {
		integrity: expectedIntegrity,
		cache: cacheDir,
		preferOnline: true,
	});
}

async function mkdirp(dirPath) {
	return mkdir(dirPath, {recursive: true});
}

async function exists(filePath) {
	try {
		await stat(filePath);
		return true;
	} catch (err) {
		// "File or directory does not exist"
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((err as any).code === "ENOENT") {
			return false;
		} else {
			throw err;
		}
	}
}

export async function getPackagesFromLockfile(
	packageInfo: PackageInfo, lockfile: Lockfile,
): Promise<PackageInfoMap> {
	if (![2, 3].includes(lockfile.lockfileVersion)) {
		throw new Error(
			`This tool requires lockfile version '2' or '3'. ` +
			`For details, see https://docs.npmjs.com/cli/configuring-npm/package-lock-json#lockfileversion`);
	}
	const workDir = path.join(tmpdir(), "no-scripts", `test-${packageInfo.packageJson.name}`);
	const packagesDir = path.join(workDir, "packages");
	const cacheDir = path.join(workDir, "cache");
	if (await exists(workDir)) {
		await rimraf(workDir);
	}
	await mkdirp(workDir);
	// console.log(`Working directory: ${workDir}`);
	const packages: PackageInfoMap = new Map();
	const lockfilePackages = Object.entries(lockfile.packages);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const requests = new Map<string, any>();
	lockfilePackages.forEach(([packageLocation, packageDescriptor]) => {
		if (packageLocation === "") {
			// Ignore root package
			return;
		}
		if (packageDescriptor.link) {
			// Ignore links
			return;
		}
		if (!packageDescriptor.resolved) {
			// Packages from other sources than an npm registry (i.e. local)
			return;
		}

		if (requests.has(packageDescriptor.resolved)) {
			// Already pending
			return;
		}
		requests.set(packageDescriptor.resolved, {
			integrity: packageDescriptor.integrity,
			packageLocation,
		});
	});

	console.log(`Fetching ${requests.size} tarballs...`);
	await Promise.all(Array.from(requests.entries())
		.map(async ([url, {integrity, packageLocation}]) => {
			const targetRelPath = packageLocation.replace("node_modules/", "");
			const targetPath = path.join(packagesDir, targetRelPath);
			await retrieveTarball(url, targetPath, cacheDir, integrity);
			const packageJson = await readPackageJson(targetPath);
			const modulePath = `<lockfile>/${packageLocation}`;
			packages.set(modulePath, {
				packageJson,
				modulePath
			});
		}));
	await rimraf(workDir);
	return packages;
}
