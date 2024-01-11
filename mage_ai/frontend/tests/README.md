# Mage's frontend testing guide

This module exists to make sure when a feature is added, either on the client or the server, it will not break existing/corresponding functionality of the client.

## Prerequisites

- It is not recommended to run tests on your working project, since failed tests can leave behind empty pipelines, triggers, etc.

```bash
# https://docs.mage.ai/contributing/development-environment
./scripts/init.sh [project_name]
```

- Make sure authentication is on.

```bash
export REQUIRE_USER_AUTHENTICATION=1
```

- Make sure your dev server is on.

## e2e

### Using the tests

You have the option to just run that one related test, or the whole thing for extra safety, although it may take a while.

```bash
# Run everything, headless by default.
yarn test
# Run everything with a browser.
yarn test:h

# Run test files that has `pipelines` in their names.
# There're dozens of ways: https://playwright.dev/docs/running-tests
yarn test pipelines
```

> [!TIP]
> If what you have been working on is of the server side, run tests like how CI runs them.
>
> ```bash
> yarn test:ci
> ```

> [!WARNING]
> If you have modified the client, make sure the pages that you are about to test are compiled, otherwise it may exceed the time limit. Also expect tests to fail - you can never be sure - just give it another go. If the problem persists, see the _Debugging_ section below.

### Building a test

_Constructing._

### Debugging

The easiest way to debug is to run tests in UI mode so you can see what went wrong.

```bash
yarn test --ui

# Or
yarn test:ci --ui
```

At this point, the error is either obvious, or not at all. In the former, if the error is coming from other parts of the app, it would be really helpful if you could tell us about it, either on [GitHub](https://github.com/mage-ai/mage-ai/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=) or [Slack](https://www.mage.ai/chat), so we can dive into it together with you. In the latter, you might want to (1) run it again, using the terminal if you were using your IDE, or the other way around (2) run it again, without the changes you have just made.
