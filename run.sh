#!/bin/sh

PATH=~/.bun/bin

bun scripts/session.js \
&& bun scripts/posts.js \
&& bun scripts/profiles.js \
&& bun scripts/stats.js \
&& bun scripts/avatars.js \
&& bun scripts/dump.js \
&& bun scripts/list.js \
&& bun scripts/archive.js
