# Nuvori publishing policy

The user instructed on 2026-10-09 that further work must stay private until they explicitly direct publication to main.

- Work on `codex/testing`. Commit and push completed changes to the **private** `testing` remote, `https://github.com/FennXWeb/Nuvori-Testing.git`, as part of each development task. Do not require another confirmation for these private pushes.
- `origin` points to the **public production** repository, `https://github.com/FennXWeb/Nuvori.git`. Do not push any branch or tag there, merge to `main`, publish a production release, or deploy GitHub Pages unless the user explicitly directs it.
- GitHub has no private branches inside a public repository. Never create a testing branch in the public repository as a substitute for this private repository.
- Run checks appropriate to the changes before pushing. Label incomplete visual checks or experimental work honestly. Never commit `.env` files, credentials, private saves, or ignored runtime files.
- This checkout uses `.githooks/pre-push` to prevent accidental pushes outside the private testing branch. Do not remove or bypass this guard without an explicit user instruction to publish or change this policy.
- The owner-requested World Studio **Publish beta to main** feature is a separate release path. Its explicit user confirmation authorizes only the reviewed beta commit and main head. The guard remains enabled and accepts a process-scoped grant for that exact production push. Adding or modifying the feature does not authorize the agent to confirm or perform a live publication on the user's behalf.
- When the user directs publication, inspect and validate the private changes, then handle the production branch and guard deliberately. Do not infer publication permission from a feature request or a request to push to GitHub.

The private GitHub workflow validates and builds testing changes. It does not deploy a public site or create releases.
