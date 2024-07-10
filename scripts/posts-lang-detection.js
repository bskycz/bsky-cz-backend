import { Database } from "bun:sqlite";
import { $ } from 'bun';

const db = new Database("db.sqlite")

let ollamaContext = null

async function detectOllama(text) {

    if (!ollamaContext) {
        const resp = await fetch("http://localhost:11434/api/generate", {
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

    const resp = await fetch("http://localhost:11434/api/generate", {
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


async function detectMistral(text) {
    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "post",
        headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${process.env.MISTRAL_TOKEN}`
        },
        body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [{ role: 'user', content: "What is the language of the following post? Please return only one 2-letter language code (do not explain which language is it) and do not write anything else:\n\n" + text }]
        }),
    })
    const json = await resp.json()
    if (!json.choices) {
        console.log(json)
        return null
    }
    /*if (!json.done) {
        console.error(json)
    }*/
    //console.log(JSON.stringify(json))
    const result = json.choices[0].message.content
    return result.trim("\n").trim()
}

while (true) {
    const posts = db.query("select * from posts where langDetected is null limit 0, 100").all()
    for (const post of posts) {
        process.stdout.write(`uri=${post.uri} text=${post.text.replace(/\n/g, '').substring(0,50)} .. `)
        const langDetected = await detectOllama(post.text)
        console.log(`detected=${langDetected}`)
        if (langDetected && langDetected.match(/^[a-z]{2}$/)) {
            db.query("update posts set langDetected=$langDetected where uri=$uri").run({ $uri: post.uri, $langDetected: langDetected })
        }
        await new Promise(r => setTimeout(r, 2000))
    }
    if (posts.length !== 100) {
        break
    }
}