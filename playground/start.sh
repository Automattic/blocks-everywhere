#!/usr/bin/env bash
#
# Start a local WordPress site using WordPress Playground, with Blocks Everywhere, Gutenberg, bbPress, and BuddyPress.
#
# Usage: playground/start.sh [--gutenberg=17.9.0] [--wp=6.6] [--port=9400]
#
# The plugin is mounted from this checkout, so run `yarn build` first, and again after changing any JS. PHP changes are
# picked up straight away. The site is reset each time it is started.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$( dirname "$DIR" )"
GUTENBERG="17.9.0"
WP="6.6"
PORT="9400"

for arg in "$@"; do
	case "$arg" in
		--gutenberg=*) GUTENBERG="${arg#*=}" ;;
		--wp=*) WP="${arg#*=}" ;;
		--port=*) PORT="${arg#*=}" ;;
		*) echo "Unknown option: $arg"; exit 1 ;;
	esac
done

if [ ! -f "$ROOT/build/index.min.js" ]; then
	echo "The plugin hasn't been built. Run yarn build first."
	exit 1
fi

BLUEPRINT="$( mktemp -d )/blueprint.json"
trap 'rm -rf "$( dirname "$BLUEPRINT" )"' EXIT
sed "s#GUTENBERG_VERSION#$GUTENBERG#" "$DIR/blueprint.json" > "$BLUEPRINT"

echo "Starting WordPress $WP with Gutenberg $GUTENBERG on http://127.0.0.1:$PORT"
echo "Logged in as admin. Log in as participant / password to test as a forum participant."
echo

npx --yes @wp-playground/cli@latest server \
	--blueprint="$BLUEPRINT" \
	--wp="$WP" \
	--php=8.2 \
	--port="$PORT" \
	--login \
	--mount="$ROOT:/wordpress/wp-content/plugins/blocks-everywhere" \
	--mount="$DIR:/playground"
