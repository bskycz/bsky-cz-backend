import { $, Glob } from "bun"
import { basename } from "node:path"

const files = []
for (const file of (new Glob("./dist/archive/*").scanSync("."))) {
    files.push(basename(file).replace(/^bsky-cz-(\d{4}-\d{2}-\d{2}).zip$/, "$1"))
}

const date = (new Date).toISOString().split('T')[0]
if (!files.includes(date)) {

    const target = `./dist/archive/bsky-cz-${date}.zip`
    console.log(`Writing archive: ${target}`)

    await $`rm -f ./tmp/tmpfile.zip`
    await $`/usr/bin/zip -9 ./tmp/tmpfile.zip ./db.sqlite`
    await $`mv ./tmp/tmpfile.zip ${target}`
}