import { $, Glob } from "bun"
import { Database } from "bun:sqlite";
import { basename } from "node:path"

const db = new Database("db.sqlite")

let files = []
for (const file of (new Glob("./dist/bundles/*").scanSync("."))) {
    files.push(basename(file).replace(/^(.+)\.json.zst$/, "$1"))
}
files = files.sort((x, y) => x > y ? 1 : -1)
const item = files[0]
console.log('Compare to:', item)
const tmpFile = "./tmp/decompressed.json"

await $`rm -f ${tmpFile}`
await $`/usr/bin/zstd -q -k -o ${tmpFile} -d ./dist/bundles/${item}.json.zst`

const json = await Bun.file(tmpFile).json()
const current = db.query("select * from users where (included = 1 or czechNational = 1)").all()

let followers = []

for (const user of current) {
    const prev = json.users.find(u => u.did === user.did)
    if (!prev) {
        continue
    }
    const changes = {}
    if (user.followers !== prev.followers) {
        const diff = user.followers - prev.followers
        followers.push({ handle: user.handle, incl: user.included, pre: prev.followers, cur: user.followers, diff: (diff > 0 ? "+" : "") + diff })
        changes['followers'] = diff
        //console.table(user.handle, 'followers', [user.followers, prev.followers])
    }
    if (user.follows !== prev.follows) {
        const diff = user.follows - prev.follows
        //followers.push({ handle: user.handle, incl: user.included, pre: prev.follows, cur: user.follows, diff: (diff > 0 ? "+" : "") + diff })
        changes['follows'] = diff
        //console.table(user.handle, 'followers', [user.followers, prev.followers])
    }
    if (user.likeCountSum !== prev.likeCountSum) {
        const diff = user.likeCountSum - prev.likeCountSum
        //likes.push({ handle: user.handle, incl: user.included, pre: prev.likeCountSum, cur: user.likeCountSum, diff: (diff > 0 ? "+" : "") + diff })
        changes['likeCountSum'] = diff
    }
    if (user.replyCountSum !== prev.replyCountSum) {
        const diff = user.replyCountSum - prev.replyCountSum
        //replies.push({ handle: user.handle, incl: user.included, pre: prev.replyCountSum, cur: user.replyCountSum, diff: (diff > 0 ? "+" : "") + diff })
        changes['replyCountSum'] = diff
    }
    if (user.repostCountSum !== prev.repostCountSum) {
        const diff = user.repostCountSum - prev.repostCountSum
        //reposts.push({ handle: user.handle, incl: user.included, pre: prev.repostCountSum, cur: user.repostCountSum, diff: (diff > 0 ? "+" : "") + diff })
        changes['repostCountSum'] = diff
    }
    if (user.localPosts !== prev.localPosts) {
        const diff = user.localPosts - prev.localPosts
        //reposts.push({ handle: user.handle, incl: user.included, pre: prev.localPosts, cur: user.localPosts, diff: (diff > 0 ? "+" : "") + diff })
        changes['localPosts'] = diff
    }

    if (Object.keys(changes).length > 0) {
        const q = `update users set ${Object.keys(changes).map(ch => `${ch}Week = ${changes[ch]}`).join(", ")} where did=$did`
        db.query(q).run({ $did: user.did })
    }
    //db.query()
}
/*console.log('Likes:')
console.table(likes.sort((x, y) => Number(x.diff) > Number(y.diff) ? -1 : 1))

console.log('Reposts:')
console.table(reposts.sort((x, y) => Number(x.diff) > Number(y.diff) ? -1 : 1))

console.log('Replies:')
console.table(replies.sort((x, y) => Number(x.diff) > Number(y.diff) ? -1 : 1))*/

console.log('Followers:')
console.table(followers.sort((x, y) => Number(x.diff) > Number(y.diff) ? -1 : 1))

await $`rm -f ${tmpFile}`
//const data = $`zstd -d `

console.log('diffs done')