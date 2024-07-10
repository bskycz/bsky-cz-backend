import { Database } from "bun:sqlite";
import { getSearchPosts } from "./lib";

const db = new Database("db.sqlite")

let i = 1
const limit = 100
const arr = []

while (true) {

    const { posts } = await getSearchPosts("česká", limit, i*100)
    //console.log(posts.map(p => `${p.author.did}: ${p.record.text}`).join("\n"))
    for (const p of posts) {
        const user = db.query("select did from users where did=$did").get({ $did: p.author.did })
        if (!user) {
            const text = p.record.text.replace(/\n/g, '').substring(0,50)
            console.log(`${p.author.handle} -- ${text}`)
            const arrItem = arr.find(i => i.did === p.author.did)
            if (!arrItem) {
                arr.push({ handle: p.author.handle, did: p.author.did, texts: [text] })
            } else {
                arrItem.texts.push(text)
            }
        }
    }

    if (i >= 50) {
        break
    }
    i++
}

console.log(arr)