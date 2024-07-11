import { $, Glob } from "bun"
import { basename } from "node:path"

const files = []
for (const file of (new Glob("./dist/archives/*").scanSync("."))) {
    files.push(basename(file).replace(/^bsky-cz-(\d{4}-\d{2}-\d{2}).sqlite.zip$/, "$1"))
}

const date = (new Date).toISOString().split('T')[0]
if (!files.includes(date)) {

    const target = `./dist/archives/bsky-cz-${date}.sqlite.zip`
    console.log(`Writing archive: ${target}`)

    await $`rm -f ./tmp/tmpfile.zip`
    await $`/usr/bin/zip -9 ./tmp/tmpfile.zip ./db.sqlite`
    await $`/usr/bin/mv ./tmp/tmpfile.zip ${target}`

    await $`cd ./dist/archives && rm -f latest.sqlite.zip && /usr/bin/ln -s ./bsky-cz-${date}.sqlite.zip latest.sqlite.zip`
    await $`cd ./dist && rm -f archive.sqlite.zip && /usr/bin/ln -s ./archives/bsky-cz-${date}.sqlite.zip archive.sqlite.zip`
}

console.log('archiving done', date)