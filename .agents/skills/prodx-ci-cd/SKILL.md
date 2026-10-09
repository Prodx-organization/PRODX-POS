---
name: prodx-ci-cd
description: Reviews PRODX-POS CI/CD workflows, security checks, migration gates, artifact provenance, release promotion, rollback, and branch protection evidence.
---

# PRODX-POS CI/CD and Release Engineering

## Non-negotiable rules
- Required checks must remain enabled and meaningful. Never disable workflows, skip jobs broadly, weaken assertions, or make failures non-blocking to manufacture green CI.
- Verify results against the exact PR head SHA and confirm that required checks completed, not merely started.
- Distinguish code/security workflows from production smoke, external integration, and deployment gates.
- Keep secrets out of repository files, workflow output, shell history, and artifacts. Prefer least-privilege, short-lived credentials.
- Build artifacts from reviewed source and preserve traceability from commit to deployment.
- Migrations must be validated before rollout; application rollback and database rollback are separate plans.
- Do not force-merge around failed checks or bypass branch protection. A disabled ruleset is a real control gap even if CI is green.

## Procedure
1. Inspect workflow definitions, required checks, permissions, trigger scope, secret exposure, and cache/artifact trust.
2. Verify each relevant run's head SHA, status, conclusion, logs, and artifacts.
3. Check dependency/security scanning, build/test gates, migration checks, and production smoke.
4. Confirm preview/staging validation and explicit production promotion/rollback strategy.
5. Inspect repository ruleset enforcement and verify it is active through authoritative settings evidence.
6. After deployment, verify the deployed commit SHA and runtime behavior.

## Checklist
- [ ] Required checks are active and tied to protected branches.
- [ ] CI results correspond to the exact candidate SHA.
- [ ] Failed/pending/blocked checks are not described as passing.
- [ ] Build/deploy artifacts are traceable to reviewed commits.
- [ ] Secrets are scoped and never printed.
- [ ] Migrations, smoke tests, rollback, and post-deploy verification are defined.
- [ ] Ruleset enforcement is active and cannot be bypassed by normal merges.

## Evidence contract
Cite workflow/run IDs, exact SHA, branch/ruleset state, deployment ID/commit, and post-deploy probes. If ruleset enforcement is disabled or production smoke fails, report the release gate as **FAIL/BLOCKED** as appropriate; do not declare release-ready based on passing unit/code workflows alone.
