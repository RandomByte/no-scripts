# no-scripts

A CLI tool that checks your project's npm dependencies and alerts you if any of them define one of the [npm lifecycle script](https://docs.npmjs.com/cli/v10/using-npm/scripts) that are automatically executed during `npm install`. Namely `preinstall`, `install`, `postinstall`, `preuninstall` and `postuninstall`.

Such scripts are typically no issue and might be required by a package to work properly. However, they can also pose a security threat as outlined [here](https://medium.com/@v_pragma/12-strange-things-that-can-happen-after-installing-an-npm-package-45de7fbf39f0) and [here](https://www.theregister.com/2018/07/12/npm_eslint/). The main danger being that a user is often not aware or fully in control of their execution.

This is a great tool to regularly execute in your CI so you can spot whether a dependency introduced an install script.

To further secure your system from such attacks you should consider having npm ignore **all** implicit scripts using the configuration command: [**`npm config set ignore-scripts true`**](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts)

Also make sure to update your CI jobs to run `npm ci --ignore-scripts` and `npm publish --ignore-scripts` (as also suggested [here](https://snyk.io/blog/github-actions-to-securely-publish-npm-packages/))

Note however that this disables **any** [pre- and post-scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts#pre--post-scripts), such as for example the commonly used `pretest` script.

Also, in case one of your dependencies does need an install script to run, you will have to manually execute [`npm rebuild <package name>`](https://docs.npmjs.com/cli/v10/commands/npm-rebuild) to run those after install or manually reset the configuration option mentioned before.

## Install

```sh
npm i -g no-scripts
```

## Usage

```sh
no-scripts
```

By default, no-scripts will analyze all **locally installed dependencies** of the project in the current working directory. For this, it evaluates the `package.json` file of every package, applying normalization using [`@npmcli/package-json`](https://www.npmjs.com/package/@npmcli/package-json) in order to also detect _implicit_ install-scripts such as `node-gyp rebuild` which would be executed if a [package contains `*.gyp` files](https://docs.npmjs.com/cli/v9/using-npm/scripts#npm-install).

**If any install-scripts have been found, the tool's exit code will be set to `1` and a list of the affected packages is shown.**



### Ignore Dependencies

```sh
no-scripts --ignore <package name> <package name> <...>
```

In case one of your project's dependencies requires an install script you can ignore that package from the analysis using the `--ignore` flag. For example `no-scripts --ignore esbuild>`

### Online Mode
```sh
no-scripts --online
```

This mode operates fully online and is therefore a little slower. Instead of analyzing already installed dependencies, it starts by independently fetching the tarballs of all dependencies listed in the project's [lockfile](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json) from the corresponding npm registry.

Since a malicious package that has already been installed *could* altered it's own package.json during the `postinstall` phase, this mode might add an extra level of safety, making it harder for such packages to fool `no-scripts` compared to the default, local scan. I have not yet evaluated the feasibility of such an attack though.

 **Note:** Local dependencies which are referenced via links or workspaces are not analyzed in this mode. You can use the [`--include-local`](#include-local-dependencies) option to additionally check those.

## Similar Projects
* [naugtur/can-i-ignore-scripts](https://github.com/naugtur/can-i-ignore-scripts)
* [spaceraccoon/npm-scan](https://github.com/spaceraccoon/npm-scan) *(archived)*
