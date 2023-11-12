# no-scripts

**Note: This tool is still in development**

A CLI tool that checks your project's npm dependencies and alerts you if any of them define one of the [npm lifecycle script](https://docs.npmjs.com/cli/v10/using-npm/scripts) that are automatically executed during `npm install`. Namely `preinstall`, `install`, `postinstall`, `preuninstall` and `postuninstall`.

Such scripts are typically no issue and might be required by a package to work properly. However, they can also pose a security threat as outlined [here](https://medium.com/@v_pragma/12-strange-things-that-can-happen-after-installing-an-npm-package-45de7fbf39f0) and [here](https://www.theregister.com/2018/07/12/npm_eslint/). The main danger being that a user is often not aware or fully in control of their execution.

This is a great tool to regularly execute in your CI so you can spot whether a dependency introduced an install script.

To further secure your system from such attacks you should consider having npm ignore **all** implicit scripts using the configuration command: [**`npm config set ignore-scripts true`**](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts)  
Note however that this disables **any** [pre- and post-scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts#pre--post-scripts), such as for example the commonly used `pretest` script.

## Usage
There are two modes of operation, "Lockfile Mode" and "package.json Mode".

### Lockfile Mode
```sh
no-scripts lockfile
```

This mode will start by fetching the tarballs of all dependencies listed in the project's lockfile from the corresponding npm registry. It then evaluates the package.json files of every package, applying normalization using [`@npmcli/package-json`](https://www.npmjs.com/package/@npmcli/package-json) in order to detect implicit install-scripts such as `node-gyp rebuild` which would be executed if a package contains a certain file.

### package.json Mode
```sh
no-scripts package-json
```

This mode operates fully offline and is therefore rather fast. However, since a malicious package that has already been installed *could* have altered it's own package.json during the `postinstall` phase, this mode might be fooled into thinking that a package has no scripts even though they were already executed. I have not yet evaluated the feasability of such an attack though.

## Similar Projects
* [naugtur/can-i-ignore-scripts](https://github.com/naugtur/can-i-ignore-scripts)
* [spaceraccoon/npm-scan](https://github.com/spaceraccoon/npm-scan) *(archived)*
