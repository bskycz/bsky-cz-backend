import { Database } from "bun:sqlite";
import { indexPosts } from "./lib";

const db = new Database("db.sqlite")


const handle = Bun.argv[2]
if (!handle) {
    console.error('Error: no handle')
    process.exit(1)
}

const limit = 100
let cursor = true
let zeroCount = 0

while (cursor) {
    const { insertedCount, lastDate, currentCursor } = await indexPosts(db, handle, limit, cursor === true ? "" : cursor, "author")
    //console.log(insertedCount, lastDate)

    if (!currentCursor) {
        break
    }

    if (insertedCount === 0) {
        zeroCount++
    }
    cursor = currentCursor
}