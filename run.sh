#!/bin/sh

PATH=~/.bun/bin

# lock
bun scripts/lock.js

# process stages
bun scripts/session.js \
&& bun scripts/posts.js \
&& bun scripts/profiles.js \
&& bun scripts/stats.js \
&& bun scripts/avatars.js \
&& bun scripts/dump.js \
&& bun scripts/list.js \
&& bun scripts/archive.js

# unlock
bun scripts/unlock.js