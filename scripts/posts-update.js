import { Database } from "bun:sqlite";
import { getPosts } from "./lib";

const db = new Database("db.sqlite")

const whereQuery = "deleted is null and (updatedAt is NULL or (julianday('now') - julianday(updatedAt)) > 0.15)"
//const whereQuery = "deleted is null and (updatedAt is NULL)"

const limit = 25
const { total } = db.query("select count() as total from posts").get()
const { count } = db.query(`select count() as count from posts where ${whereQuery}`).get()
console.log({ total, count })
const start = Date.now()
let i = 0
let steps = 0
let modified = 0
let lockedState = false
while (i < count) {

    const locked = await (Bun.file("./run.lock").exists())
    if (locked) {
        if (lockedState) {
            process.stdout.write('.')
        } else {
            process.stdout.write("\n[!] lock exists, sleeping: ")
        }
        lockedState = true
        await new Promise(r => setTimeout(r, 1000))
        continue
    } else if (lockedState) {
        lockedState = false
        process.stdout.write("\n")
    }

    const postsDb = db.query(`select * from posts where ${whereQuery} order by updatedAt asc, createdAt asc limit 0, $limit`).all({ $i: i, $limit: limit })

    const uris = postsDb.map(p => p.uri)
    const { posts, remainingLimit } = await getPosts(uris)
    //console.log(remainingLimit, posts.length)
    for (const post of posts) {
        db.query("update posts set labels = $labels, likeCount = $likeCount, repostCount = $repostCount, replyCount = $replyCount, updatedAt = datetime('now') where uri = $uri").run({
            $uri: post.uri,
            $labels: JSON.stringify(post.labels),
            $likeCount: post.likeCount,
            $repostCount: post.repostCount,
            $replyCount: post.replyCount,
        })
        uris.splice(uris.indexOf(post.uri), 1);
    }
    // process posts which is deleted
    if (uris.length > 0) {
        for (const uri of uris) {
            db.query("update posts set deleted = 1, updatedAt = datetime('now') where uri=$uri").run({ $uri: uri })
        }
    }
    const deleted = uris.length || 0

    modified += posts.length
    process.stdout.write(`+${posts.length}${deleted > 0 ? " -" + deleted : ""} (${modified}) `)
    i += limit

    if (steps % 100 === 0) {
        const seconds = (Date.now() - start) / 1000
        const perSecond = i / seconds
        console.log(`\n--- remainingLimit=${remainingLimit} | ${seconds}s | ${perSecond} p/s | ${count - i} remaining (${((count - i) / perSecond) / 60}m)`)
    }
    await new Promise(r => setTimeout(r, 1))
    steps++
}
