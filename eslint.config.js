import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
	{
		ignores: [
			"node_modules/",
			"bower_components/",
			"coverage/",
			"test/tmp/",
			"test/projects/",
			"test/fixtures/",
			"lib/",
			"test-package/",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
			ecmaVersion: 2022,
			sourceType: "module",
		},
		rules: {
			"indent": ["error", "tab"],
			"linebreak-style": ["error", "unix"],
			"quotes": ["error", "double", {"allowTemplateLiterals": true}],
			"semi": ["error", "always"],
			"max-len": [
				"error",
				{
					"code": 120,
					"ignoreUrls": true,
					"ignoreRegExpLiterals": true,
				},
			],
			"no-implicit-coercion": [2, {"allow": ["!!"]}],
			"no-console": "off",
		},
	},
);
