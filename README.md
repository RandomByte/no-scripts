# no-scripts

A CLI tool that checks your project's npm dependencies and alerts you if any of them define one of the [npm lifecycle script](https://docs.npmjs.com/cli/v10/using-npm/scripts) that are automatically executed during `npm install`. Namely `preinstall`, `install`, `postinstall`, `preuninstall` and `postuninstall`.

Such scripts are typically no issue and might be required by a package to work properly. However, they can also pose a security threat as outlined [here](https://medium.com/@v_pragma/12-strange-things-that-can-happen-after-installing-an-npm-package-45de7fbf39f0) and [here](https://www.theregister.com/2018/07/12/npm_eslint/). The main danger being that a user is often not aware or fully in control of their execution.

This is a great tool to regularly execute in your CI so you can spot whether a dependency introduced an install script.

To further secure your system from such attacks you should consider having npm ignore **all** implicit scripts using the configuration command: [**`npm config set ignore-scripts true`**](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts)

Also make sure to update your CI jobs to run `npm ci --ignore-scripts` and `npm publish --ignore-scripts` (as also suggested by [snyk](https://snyk.io/blog/github-actions-to-securely-publish-npm-packages/) for example)

Note however that this disables **any** [pre- and post-scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts#pre--post-scripts), such as for example the commonly used `pretest` script.

Also, in case one of your dependencies does need an install script to run, you will have to manually execute [`npm rebuild <package name>`](https://docs.npmjs.com/cli/v10/commands/npm-rebuild) to run those after install.

## Install

```sh
npm install --global no-scripts
```

## Usage

```sh
no-scripts
```

By default, no-scripts will start by fetching the tarballs of all dependencies listed in the project's [lockfile](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json) from the corresponding npm registry. It then evaluates the `package.json` files of every package, applying normalization using [`@npmcli/package-json`](https://www.npmjs.com/package/@npmcli/package-json) in order to detect implicit install-scripts such as `node-gyp rebuild` which would be executed if a package contains `*.gyp` files.

If any install-scripts have been found, the tools exit code will be set to `1`.

**Note:** Local dependencies which are referenced via links or workspaces are not analyzed. You can use the [`--include-local`](#include-local-dependencies) option to additionally check those.

### Ignore Dependencies

```sh
no-scripts --ignore <package name> <package name> <...>
```

In case one of your project's dependencies requires an install script you can ignore that package from the analysis using the `--ignore` flag. For example `no-scripts --ignore esbuild>`

### Include Local Dependencies
```sh
no-scripts --include-local
```

This mode operates fully offline and is therefore rather fast. However, since a malicious package that has already been installed *could* have altered it's own package.json during the `postinstall` phase, this mode might be fooled into thinking that a package has no scripts even though they were already executed. I have not yet evaluated the feasability of such an attack though.

### Offline
```sh
no-scripts --offline
```

This option implies [`--include-local`](#include-local-dependencies) as it completely skips the default behavior of resolving the packages listed in the lockfile using a remote registry.

## Similar Projects
* [naugtur/can-i-ignore-scripts](https://github.com/naugtur/can-i-ignore-scripts)
* [spaceraccoon/npm-scan](https://github.com/spaceraccoon/npm-scan) *(archived)*
