import { Database } from "bun:sqlite";
import { getPosts } from "./lib";

const db = new Database("db.sqlite")

const limit = 25
const { total } = db.query("select count() as total from posts").get()
const { count } = db.query("select count() as count from posts where (updatedAt is NULL or (julianday('now') - julianday(updatedAt)) > 1)").get()
console.log({ total, count })

let i = 0
while(i < count) {
    const postsDb = db.query("select * from posts where (updatedAt is NULL or (julianday('now') - julianday(updatedAt)) > 1) limit $i, $limit").all({ $i: i, $limit: limit })

    const { posts, remainingLimit } = await getPosts(postsDb.map(p => p.uri))
    console.log(remainingLimit, posts.length)
    for (const post of posts) {
        db.query("update posts set labels = $labels, likeCount = $likeCount, repostCount = $repostCount, replyCount = $replyCount, updatedAt = datetime('now') where uri = $uri").run({ 
            $uri: post.uri,
            $labels: JSON.stringify(post.labels),
            $likeCount: post.likeCount,
            $repostCount: post.repostCount,
            $replyCount: post.replyCount,
        })
    }
    i += limit
}
