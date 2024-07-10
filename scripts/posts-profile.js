import { Database } from "bun:sqlite";
import { indexPosts } from "./lib";

const db = new Database("db.sqlite")


const limit = 50
let cursor = 0
let zeroCount = 0

while (zeroCount < 5) {
    const { insertedCount, lastDate } = await indexPosts(db, "from:realphilhazard.bsky.social", limit, cursor)
    console.log(insertedCount, lastDate)

    if (insertedCount === 0) {
        zeroCount++
    }
    cursor += limit
}