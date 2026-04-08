# CI/CD acceptance criteria — branches vs tags

This document defines **acceptance criteria** for how CI/CD for this backend **must** be triggered:

- **Dev and QA hosted environments**: pipelines run on pushes to the **`dev`** and **`qa`** git branches (not via version tags).
- **Production deployment**: runs only when a **git tag** is created and pushed (e.g. `v1.2.3`).

`NODE_ENV` and other runtime settings for each deployment are configured in that environment’s secrets / config store — they are **not** implied by the branch name.

---

## Scope

| Trigger | Intended use |
|---------|----------------|
| Push to **`dev`** | CI (and optional CD) for the **development** deployment target. |
| Push to **`qa`** | CI (and optional CD) for the **QA** deployment target. |
| Push **tag** `v*` (or agreed pattern) | **Production** build / deploy / publish. |

---

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| **AC-1** | A push to branch **`dev`** triggers the workflow that builds/tests and, if applicable, deploys to the **dev** environment. | Push to `dev`; expected jobs run; prod deploy job does **not** run. |
| **AC-2** | A push to branch **`qa`** triggers the workflow that builds/tests and, if applicable, deploys to the **QA** environment. | Push to `qa`; expected jobs run; prod deploy job does **not** run. |
| **AC-3** | **Production** deployment (or production image publish) runs **only** on **tag** events (e.g. `push` of tags matching `v*`), not on `dev` / `qa` / `main` branch pushes alone. | Push to `dev` or `qa` without a tag; prod deploy does **not** run. Push tag; prod pipeline runs. |
| **AC-4** | Workflow definitions separate **branch** triggers (`dev`, `qa`) from **tag** triggers so prod cannot be fired by an ordinary branch push. | Inspect CI config: prod job `if:` / `rules:` / `on:` is tag-only. |
| **AC-5** | Runbooks state: dev/qa via **branches**, production via **tags**. | README, `DEPLOYMENT.md`, or this doc is linked from onboarding. |

---

## Implementation notes (reference only)

### GitHub Actions — sketch

**Dev / QA** (example: one workflow, matrix or separate jobs):

```yaml
on:
  push:
    branches:
      - dev
      - qa
```

**Production** (separate workflow or job with `if:`):

```yaml
on:
  push:
    tags:
      - 'v*'
```

Ensure the **prod** workflow is not listed under `branches:` for deploy jobs.

### GitLab CI — sketch

```yaml
deploy_dev:
  rules:
    - if: $CI_COMMIT_BRANCH == "dev"

deploy_qa:
  rules:
    - if: $CI_COMMIT_BRANCH == "qa"

deploy_production:
  rules:
    - if: $CI_COMMIT_TAG
```

---

## Sign-off checklist

- [ ] `dev` branch push runs dev CI/CD as agreed.
- [ ] `qa` branch push runs QA CI/CD as agreed.
- [ ] Production deploy runs only on pushed release tags (not on branch-only pushes).
- [ ] Team documents how to cut a release (create/push tag).
