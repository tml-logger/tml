# Contributing to TML

Bug reports, documentation improvements, and focused pull requests are welcome.
For larger changes, open a feature request first so the approach can be discussed.
For suspected vulnerabilities, follow the [security policy](SECURITY.md).

## Report a bug or suggest a feature

Search existing issues before opening a new one. For bugs, include the affected
package and version, your runtime, expected behavior, and a minimal reproduction.
Use synthetic data in examples and logs. For feature requests, explain the
problem you want to solve and any alternatives you have tried.

## Set up the project

Use Node.js 26 and the Yarn version pinned in `package.json`. Fork the repository,
clone your fork, and create a branch for your changes. If Corepack is not
installed, run:

```sh
npm install --global corepack@0.36.0 --ignore-scripts
```

From the repository root:

```sh
corepack enable
yarn install --immutable
yarn build
yarn test
```

The repository contains three libraries in `packages/core`, `packages/browser`,
and `packages/node`, plus an unpublished React + Express demo in
`packages/demo-react-fullstack`. See the [README](README.md#development) for
development and demo commands.

## Make a change

Keep each pull request focused on one problem. Follow the surrounding
TypeScript style, use braces for control flow, and avoid ternary expressions
as required by the lint configuration. Update relevant documentation and add
or adjust tests when behavior changes.

Before opening a pull request, run:

```sh
yarn lint
yarn build
yarn typecheck
yarn test
```

Build before running the full test suite because demo tests use the libraries'
built exports. For changes to the demo's browser behavior, also run:

```sh
yarn workspace demo-react-fullstack playwright install chromium
yarn demo:test:e2e
```

## Open a pull request

Target `master`. Explain the problem, what your change does, and how you checked
it. Link the relevant issue if one exists. Include screenshots for visible UI
changes. A maintainer may need to approve CI runs for contributions from forks.

Keep discussion constructive and respectful. Contributions are made under the
project's [MIT license](LICENSE).
