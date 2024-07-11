import { $, Glob } from "bun"
import { basename } from "node:path"

const files = []
for (const file of (new Glob("./dist/archives/*").scanSync("."))) {
    files.push(basename(file).replace(/^bsky-cz-(\d{4}-\d{2}-\d{2}).sql.zst$/, "$1"))
}

const date = (new Date).toISOString().split('T')[0]
if (!files.includes(date)) {

    const target = `./dist/archives/bsky-cz-${date}.sql.zst`

    console.log(`Dumping SQLite3 db to sql and writing archive: ${target}`)
    await $`rm -f ./tmp/tmpfile.zst`
    await $`/usr/bin/sqlite3 ./db.sqlite .dump | /usr/bin/zstd -z -T4 -10 -o ./tmp/tmpfile.zst -`

    //await $`/usr/bin/zip -9 ./tmp/tmpfile.zip ./db.sqlite`
    await $`/usr/bin/mv ./tmp/tmpfile.zst ${target} && chmod go+r ${target}`

    await $`cd ./dist/archives && rm -f latest.sql.zst && /usr/bin/ln -s ./bsky-cz-${date}.sql.zst latest.sql.zst`
    await $`cd ./dist && rm -f archive.sql.zst && /usr/bin/ln -s ./archives/bsky-cz-${date}.sql.zst archive.sql.zst`
    await $`rm -f ./tmp/tmpfile.zst`
}

console.log('archiving done', date)