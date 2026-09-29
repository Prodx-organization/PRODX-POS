#!/usr/bin/env bash
set -euo pipefail

# Hardened bridge for a trusted Gemini/Antigravity runtime.
# Required: gh authenticated with Actions: write + repository read access.
# Usage: ./scripts/ci/dispatch-antigravity-executor.sh <PR_NUMBER>

pr_number="${1:-}"
repo="${GITHUB_REPOSITORY:-}"
workflow=".github/workflows/antigravity-autonomous-coding.yml"

test -n "$pr_number"
if [ -z "$repo" ]; then
  repo="$(gh repo view --json nameWithOwner --jq '.nameWithOwner')"
fi

metadata="$(gh pr view "$pr_number" --repo "$repo" --json number,state,baseRefName,headRepositoryOwner,headRepository,headRefName,headRefOid)"
test "$(jq -r '.number' <<<"$metadata")" = "$pr_number"
test "$(jq -r '.state' <<<"$metadata")" = "OPEN"
test "$(jq -r '.baseRefName' <<<"$metadata")" = "main"
test "$(jq -r '.headRepositoryOwner.login + "/" + .headRepository.name' <<<"$metadata")" = "$repo"

head_ref="$(jq -r '.headRefName' <<<"$metadata")"
head_sha="$(jq -r '.headRefOid' <<<"$metadata")"
test "${#head_sha}" -eq 40

case "$head_ref" in
  antigravity/*|fix/p0-*|fix/ci-gemini-trust-p0-branches-current-main|codex/production-readiness-idempotency-race|chore/github-hosted-gemini-runtime|fix/production-shift-screen-boundary|feat/inventory-production-write-boundary)
    ;;
  *)
    echo "Refusing dispatch for untrusted branch: $head_ref" >&2
    exit 1
    ;;
esac

# workflow_dispatch is resolved from the default branch. The workflow itself
# performs the final PR/HEAD trust check before any secret-bearing execution.
gh workflow run "$workflow" --repo "$repo" --ref main -f pr_number="$pr_number"

echo "DISPATCH_REQUESTED=true"
echo "PR=$pr_number"
echo "HEAD_SHA=$head_sha"
echo "WORKFLOW=$workflow"
