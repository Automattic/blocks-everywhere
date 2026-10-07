#!/usr/bin/env bash
#
# Run the security regression tests in WordPress Playground, with bbPress and BuddyPress installed.
#
# Usage: tests/e2e/run.sh [git-ref] [--verbose]
#
# With a git ref (for example `trunk`) the tests are run against that version of the plugin, using the tests from the
# current checkout. This is useful to show that the attacks work before a fix.

set -euo pipefail

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
E2E="$ROOT/tests/e2e"
PLUGIN="$ROOT"
OUT="$( mktemp -d )"
WORKTREE=""
VERBOSE=""

cleanup() {
	rm -rf "$OUT"

	if [ -n "$WORKTREE" ]; then
		git -C "$ROOT" worktree remove --force "$WORKTREE"
	fi
}
trap cleanup EXIT

for arg in "$@"; do
	if [ "$arg" = "--verbose" ]; then
		VERBOSE="--verbose"
	else
		WORKTREE="$( mktemp -d )/blocks-everywhere"
		git -C "$ROOT" worktree add --quiet --detach "$WORKTREE" "$arg"
		PLUGIN="$WORKTREE"
		echo "Testing plugin at $arg"
	fi
done

if ! npx --yes @wp-playground/cli@latest run-blueprint \
	--blueprint="$E2E/blueprint.json" \
	--mount="$PLUGIN:/wordpress/wp-content/plugins/blocks-everywhere" \
	--mount="$E2E:/e2e" \
	--mount="$OUT:/e2e-out" > "$OUT/playground.log" 2>&1; then
	grep -v "npm warn" "$OUT/playground.log"
	exit 1
fi

if [ -f "$OUT/setup-error.txt" ]; then
	cat "$OUT/setup-error.txt"
	exit 1
fi

if [ ! -f "$OUT/results.json" ]; then
	echo "No results were written"
	grep -v "npm warn" "$OUT/playground.log"
	exit 1
fi

php "$E2E/report.php" "$OUT/results.json" $VERBOSE
