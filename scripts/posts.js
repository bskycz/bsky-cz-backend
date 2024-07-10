
import { Database } from "bun:sqlite"
import { indexPosts } from './lib.js'

const LANG = "cs"

const db = new Database("db.sqlite")

let date = Bun.argv[2] || (new Date()).toISOString()
let cursor = Number(Bun.argv[3] || 0)
let zeroCounter = 0
const q = `lang:${LANG} until:${date}`
const limit = 100

console.log(`Starting cursor: ${cursor}, date: ${date}\n`)

while (true) {
    const { insertedCount, lastDate } = await indexPosts(db, q, limit, cursor)

    if (insertedCount === 0) {
        zeroCounter++
    }

    await new Promise(r => setTimeout(r, 1))
    cursor += limit

    if (cursor === 10000) {
        cursor = 0
        date = lastDate
    }
    if (zeroCounter >= 5) {
        console.log('done')
        break
    }
}
