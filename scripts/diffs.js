import { $, Glob } from "bun"
import { Database } from "bun:sqlite";
import { basename } from "node:path"

const db = new Database("db.sqlite")

let files = []
for (const file of (new Glob("./dist/dumps/*").scanSync("."))) {
    files.push(basename(file).replace(/^(.+)\.zst$/, "$1"))
}
files = files.sort((x, y) => x > y ? 1 : -1)
const item = files[0]
const tmpFile = "./tmp/decompressed.json"

await $`rm -f ${tmpFile}`
await $`zstd -k -o ${tmpFile} -d ./dist/dumps/${item}.zst`

const json = await Bun.file(tmpFile).json()
const current = db.query("select * from users where (included = 1 or czechNational = 1)").all()

for (const user of current) {
    const prev = json.users.find(u => u.did === user.did)
    if (!prev) {
        continue
    }
    if (user.followers !== prev.followers) {
        console.log(user.handle, [user.followers, prev.followers])
    }
    if (user.likeCountSum !== prev.likeCountSum) {
        console.log(user.handle, [user.likeCountSum, prev.likeCountSum])
    }
}

await $`rm -f ${tmpFile}`
//const data = $`zstd -d `