import { Database } from "bun:sqlite";
import { $ } from 'bun';

const db = new Database("langdb.sqlite")

db.query("PRAGMA journal_mode=WAL;").run()
db.query("PRAGMA synchronous = normal;").run()
db.query("PRAGMA temp_store = memory;").run()
db.query("PRAGMA mmap_size = 30000000000;").run()

let ollamaContext = null

async function detectOllama(text) {

    const port = Math.random() < 0.5 ? 11434 : 11435
    const url = `http://localhost:${port}/api/generate`
    if (!ollamaContext) {
        const resp = await fetch(url, {
            method: "post",
            body: JSON.stringify({
                model: "gemma2",
                stream: false,
                prompt: 'I want you act as a language detector. I will type a text in any language and you will answer me in which language the text I wrote is in you. Do not write any explanations or other words, just reply with the two-letter language name (like "en"). My first sentence is "Kiel vi fartas? Kiel iras via tago?"'
            }),
        })
        const json = await resp.json()
        ollamaContext = json.context
        if (!json.done) {
            console.error(json)
            process.exit()
        }
    }

    const resp = await fetch(url, {
        method: "post",
        body: JSON.stringify({
            model: "gemma2",
            stream: false,
            context: ollamaContext,
            prompt: text
        }),
    })
    const json = await resp.json()
    if (!json.done) {
        console.error(json)
    }
    return json.response.trim("\n").trim()
}

const start = Date.now()
let processed = 0

async function detect(post) {
    let langDetected = await detectOllama(post.text)
    if (!langDetected || !langDetected.match(/^[a-z]{2}$/)) {
        langDetected = "~~"
    }
    console.log(`uri=${post.uri} text=${post.text.replace(/\n/g, '').substring(0, 64)} == ${langDetected}`)
    db.query("update posts set langDetected=$langDetected where uri=$uri").run({ $uri: post.uri, $langDetected: langDetected })
    //}
    processed++
}

const { total } = db.query(`select count() as total from posts where langDetected is null`).get()

const limit = 128
while (true) {
    const posts = db.query(`select * from posts where langDetected is null limit 0, ${limit}`).all()

    await Promise.all(posts.map(p => detect(p)))
    /*for (const post of posts) {
        //await new Promise(r => setTimeout(r, 2000))
    }*/
    const elapsed = (Date.now() - start) / 1000
    const pps = processed / elapsed
    console.log(`---- ${elapsed}s elapsed --- ${pps} pps --- ${((Number(total) / pps) / 60) / 60}h left`)
    if (posts.length !== limit) {
        break
    }
}