import { Database } from "bun:sqlite";

const db = new Database("db.sqlite")

console.log(`Stats for users .. `)
const users = db.query('select * from users').all()
console.log(`total users: ${users.length}`)
for (const user of users) {
    //console.log(user.did)
    const langQuery = '(langDetected="cs" or (langDetected is NULL and langs like "%cs%"))'
    const posts = db.query(`select count(*) as count from posts where author=$author and ${langQuery}`).get({ $author: user.did })
    if (posts.count >= 0) {
        const lastPost = db.query(`select uri, createdAt from posts where author=$author and ${langQuery} order by createdAt desc limit 1`).get({ $author: user.did })
        const firstPost = db.query(`select uri, createdAt from posts where author=$author and ${langQuery} order by createdAt asc limit 1`).get({ $author: user.did })
        const postActivity = db.query(`select sum(likeCount) as likeCountSum, sum(replyCount) as replyCountSum, sum(repostCount) as repostCountSum from posts where author=$author and ${langQuery}`).get({ $author: user.did })
        //console.log(`user: ${user.handle}, posts: ${posts.count} (${JSON.stringify(postActivity)})`)
        const localPostsRatio = Math.round((posts.count / (user.posts)) * 100) / 100
        db.query('update users set localPosts=$localPosts, localPostsRatio=$localPostsRatio, lastPostDate=$lastPostDate, firstPostDate=$firstPostDate, followerPostRatio=$followerPostRatio, included=$included, likeCountSum=$likeCountSum, replyCountSum=$replyCountSum, repostCountSum=$repostCountSum where did=$did').run({
            $did: user.did,
            $localPosts: posts.count,
            $localPostsRatio: localPostsRatio,
            $lastPostDate: lastPost?.createdAt,
            $firstPostDate: firstPost?.createdAt,
            $followerPostRatio: user.followers > 0 ? Math.round((user.followers / (user.posts)) * 100) / 100 : 0,
            $included: Boolean(localPostsRatio >= 0.5 && posts.count >= 5 && user.redacted == 0 && user.optout == 0 && user.deleted == 0),
            $likeCountSum: postActivity.likeCountSum,
            $replyCountSum: postActivity.replyCountSum,
            $repostCountSum: postActivity.repostCountSum,
        })
        //process.stdout.write('.')
    }
}
console.log("done")
