# Contributing to Tanilytics SDK

👋 Welcome! Thank you for your interest in contributing. Whether you're fixing bugs, adding features, improving documentation, or sharing feedback, your involvement helps make the SDK better for everyone.

To contribute to this project, please follow a ["fork and pull request"](https://docs.github.com/en/get-started/quickstart/contributing-to-projects) workflow. Please do not try to push directly to this repo unless you are a maintainer.

## Ways to Contribute

### 🐛 Report Bugs

Found a bug? Please help us fix it by following these steps:

1. **Search**: Check if the issue already exists in our [GitHub Issues](https://github.com/Tanilytics/analytics-sdk/issues)
2. **Create issue**: If no issue exists, create a new one. When writing, be sure to follow the template provided and include a [minimal, reproducible example](https://stackoverflow.com/help/minimal-reproducible-example). Attach any relevant labels to the final issue once created.
3. **Wait**: A project maintainer will triage the issue and may ask for additional information. Please be patient as we manage a high volume of issues. Do not bump the issue unless you have new information to provide.

> **Note**: If a project maintainer is unable to reproduce the issue, it is unlikely to be addressed in a timely manner.

If you are adding an issue, please try to keep it focused on a single topic. If two issues are related, or blocking, please link them rather than combining them. For example: "This issue is blocked by #123 and related to #456."

### 💡 Request Features

Have an idea for a new feature or enhancement?

1. **Search**: Search the [issues](https://github.com/Tanilytics/analytics-sdk/issues) for existing feature requests
2. **Discuss**: If no requests exist, start a new discussion under the relevant category so that project maintainers and the community can provide feedback
3. **Describe**: Be sure to describe the use case and why it would be valuable to others. If possible, provide examples or mockups where applicable. Outline test cases that should pass.

### 📖 Improve Documentation

Documentation improvements are always welcome! We strive to keep our docs clear and comprehensive, and your perspective can make a big difference. Update the README or relevant package docs as needed.

### 🛠️ Contribute Code

With a growing userbase, it can be hard for our small team to keep up with all the feature requests and bug fixes. If you have the skills and time, we would love your help!

- If you start working on an issue, please assign it to yourself or ask a maintainer to do so. This helps avoid duplicate work.
- If you are looking for something to work on, check out the issues labeled ["good first issue"](https://github.com/Tanilytics/analytics-sdk/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or ["help wanted"](https://github.com/Tanilytics/analytics-sdk/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

### 🔌 Add an Integration

Media adapters are a core extension point of the Tanilytics SDK. Adapters provide standard interfaces for tracking media events through the same privacy, session, and queue pipeline as manual and autocaptured events.

**Why contribute an adapter?**

- **Discoverability**: Tanilytics is designed for developers who need lightweight, privacy-respecting analytics with first-class media support.
- **Interoperability**: Adapters expose a standard interface (`name`, `attach(api)`, `detach()`), allowing developers to easily swap or combine them.
- **Best Practices**: The adapter interface encourages safe attachment and cleanup patterns around browser APIs and media player lifecycles.

See the existing `@tanilytics/adapter-youtube` package for patterns and implementation details. New adapters should follow the same package structure under `packages/media-adapters/`.

## 📁 Project Structure

This is a monorepo managed with [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) and [Nx](https://nx.dev/). Here's an overview of the main packages:

| Package                       | Path                              | Description                       |
| ----------------------------- | --------------------------------- | --------------------------------- |
| `tanilytics`                  | `packages/core`                   | Main browser analytics SDK        |
| `@tanilytics/adapter-youtube` | `packages/media-adapters/youtube` | YouTube iframe media adapter      |
| `@tanilytics/adapter-videojs` | `packages/media-adapters/videojs` | Video.js adapter package scaffold |
| `@tanilytics/adapter-hlsjs`   | `packages/media-adapters/hlsjs`   | hls.js adapter package scaffold   |

## 📝 Pull Request Guidelines

When submitting a pull request:

1. **Fill out the PR template** - Describe what your PR does, why it's needed, and any relevant context
2. **Link related issues** - Use closing keywords like `Fixes #123` to automatically close issues when your PR is merged
3. **Keep PRs focused** - One feature or fix per PR makes review easier and faster
4. **Add tests** - Include unit tests for new functionality; core uses `*.test.ts`, media adapters generally use `*.spec.ts`
5. **Update documentation** - If your change affects public APIs, update the relevant docs
6. **Run checks locally** - Make sure `bunx nx run-many -t lint`, `bun run format:check`, and `bunx nx run-many -t test` pass before pushing

### Review Process

- A maintainer will review your PR and may request changes
- Please respond to feedback in a timely manner
- Once approved, a maintainer will merge your PR

> **Tip**: If you'd like a shout-out on Twitter when your contribution is released, include your Twitter handle in the PR description!

## 💬 Communication

- **[GitHub Issues](https://github.com/Tanilytics/analytics-sdk/issues)**: Bug reports and feature requests
- **[GitHub Discussions](https://github.com/Tanilytics/analytics-sdk/discussions)**: General questions, ideas, and community feedback

## 🙋 Getting Help

Although we try to have a developer setup to make it as easy as possible for others to contribute (see below), it is possible that some pain point may arise around environment setup, linting, documentation, or other.

Should that occur, please contact a maintainer! Not only do we want to help get you unblocked, but we also want to make sure that the process is smooth for future contributors.

In a similar vein, we do enforce certain linting, formatting, and documentation standards in the codebase. If you are finding these difficult (or even just annoying) to work with, feel free to contact a maintainer for help - we do not want these to get in the way of getting good code into the codebase.

## 🏭 Release Process

As of now, Tanilytics has an ad hoc release process: releases are cut with high frequency by a maintainer and published to [npm](https://www.npmjs.com/package/tanilytics).

If your contribution has made its way into a release, we will want to give you credit on Twitter (only if you want though)! If you have a Twitter account you would like us to mention, please let us know in the PR or in another manner.

## 🛠️ Tooling

This project uses the following tools, which are worth getting familiar with if you plan to contribute:

- **[bun](https://bun.sh/)** - dependency management and runtime
- **[Nx](https://nx.dev/)** - monorepo task runner and caching
- **[Rollup](https://rollupjs.org/)** - bundling (per-package `rollup.config.cjs`)
- **[Vitest](https://vitest.dev/)** - testing
- **[ESLint](https://eslint.org/)** - linting (shared flat config in `eslint.config.mjs`)
- **[Prettier](https://prettier.io/)** - code formatting

## 🚀 Quick Start

Clone this repo, then cd into it:

```bash
cd analytics-sdk
```

Next, try running the following common tasks:

## ✅ Common Tasks

Our goal is to make it as easy as possible for you to contribute to this project. All commands can be run from the project root using `bunx nx <target> <project>` to target specific workspaces.

Common project targets:

- `bunx nx build tanilytics` - the main `tanilytics` package
- `bunx nx test tanilytics` - run core tests
- `bunx nx lint tanilytics` - lint core
- `bunx nx typecheck tanilytics` - typecheck core
- `bunx nx build @tanilytics/adapter-youtube` - build the YouTube adapter

### Setup

**Prerequisite**: [bun](https://bun.sh/) is required. Please check `bun -v` and install it if required.

To get started, install the dependencies for the project from the root:

```bash
bun install
```

Then, build all packages:

```bash
bunx nx run-many -t build
```

### Linting

We use [ESLint](https://eslint.org/) with a shared flat config to enforce lint rules. To run the linter:

```bash
bunx nx run-many -t lint
```

Or for a specific package:

```bash
bunx nx lint tanilytics
```

### Formatting

We use [Prettier](https://prettier.io/) to enforce code formatting style. To run the formatter:

```bash
bun run format
```

To just check for formatting differences, without fixing them:

```bash
bun run format:check
```

### Testing

In general, tests should be added close to the modules they are testing.

If you add new logic, please add a unit test. Core generally uses `*.test.ts`; media adapters generally use `*.spec.ts`.

To run unit tests for a specific package:

```bash
bunx nx test tanilytics
bunx nx test @tanilytics/adapter-youtube
```

To run a single test file:

```bash
bunx nx test tanilytics -- --run src/config/validator.test.ts
```

To run a single named test:

```bash
bunx nx test tanilytics -- --run src/config/validator.test.ts -t "throws when siteToken is missing"
```

To run all tests across the workspace:

```bash
bunx nx run-many -t test
```

### Building

To build a specific package:

```bash
bunx nx build tanilytics
bunx nx build @tanilytics/adapter-youtube
```

To build all packages:

```bash
bunx nx run-many -t build
```

### Type Checking

To typecheck a specific package:

```bash
bunx nx typecheck tanilytics
```

To typecheck all packages:

```bash
bunx nx run-many -t typecheck
```
