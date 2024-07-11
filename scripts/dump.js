import { Database } from "bun:sqlite";
import { $ } from "bun"

const db = new Database("db.sqlite")

// users base
console.log('Getting users base data ..')
const users = db.query("select * from users").all()

// stats
const periods = [
    ["day", 1],
    ["week", 7],
    ["month", 30],
]

const stats = {}
for (const p of periods) {
    console.log(`Generating stats [${p[0]}] ..`)
    stats[p[0]] = db.query("SELECT u.did, COUNT(p.uri) AS count FROM users u LEFT JOIN posts p ON u.did = p.author WHERE julianday('now') - julianday(p.createdAt) <= $days AND u.included = 1 GROUP BY u.did ORDER BY count DESC").all({
        $days: p[1]
    })
}

console.log(`Generating post stats ..`)
const postStats = db.query("WITH RECURSIVE dates(date) AS (SELECT DATE('2023-04-01') UNION ALL SELECT DATE(date, '+1 day') FROM dates WHERE date < DATE('now')), posts_with_users AS (SELECT p.createdAt, p.author FROM posts p INNER JOIN users u ON p.author = u.did WHERE u.included = '1'), daily_post_counts AS (SELECT DATE(pwu.createdAt) AS date, COUNT(*) AS count FROM posts_with_users pwu GROUP BY DATE(pwu.createdAt)), cumulative_post_counts AS (SELECT d.date, COALESCE(dpc.count, 0) AS count, SUM(COALESCE(dpc.count, 0)) OVER (ORDER BY d.date) AS total FROM dates d LEFT JOIN daily_post_counts dpc ON d.date = dpc.date) SELECT date, count, total FROM cumulative_post_counts ORDER BY date;").all()

console.log(`Generating user stats ..`)
const userStats = db.query("WITH RECURSIVE dates(date) AS (SELECT DATE('2023-04-01') UNION ALL SELECT DATE(date, '+1 day') FROM dates WHERE date < DATE('now')) SELECT d.date, (SELECT COUNT(*) FROM users u WHERE DATE(u.createdAt) = d.date AND u.included='1') AS count, (SELECT COUNT(*) FROM users u WHERE DATE(u.createdAt) <= d.date AND u.included='1') AS total FROM dates d GROUP BY d.date ORDER BY d.date;").all()

console.log('Writing ..')
const time = (new Date).toISOString()
await Bun.write('./dist/index.json', JSON.stringify({ users, stats, postStats, userStats, time }, null, 2))
await Bun.write('./dist/users.json', JSON.stringify({ users, time }, null, 2))
await Bun.write('./dist/stats.json', JSON.stringify({ stats, postStats, userStats, time }, null, 2))

console.log('Compressing bundle into archive ..')
await $`/usr/bin/zstd -z -15 -o ./dist/dumps/${time}.zst ./dist/index.json`

console.log('done', time)