import { Database } from "bun:sqlite";
import { $ } from 'bun';
import { locker } from './lib';

const db = new Database("db.sqlite")

let ollamaContext = null

function getRandomValueFromArray(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

async function detectOllama(text) {

    const port = getRandomValueFromArray([11434, 11435])
    //const port = getRandomValueFromArray([11437, 11438])

    const url = `http://localhost:${port}/api/generate`
    //if (!ollamaContext) {
    const resp = await fetch(url, {
        method: "post",
        body: JSON.stringify({
            model: "gemma2",
            stream: false,
            /*prompt: `
You are a specialized language detection model for Bluesky posts. Your task is to identify the primary language of each post provided. Follow these guidelines:

1. Analyze the given text and determine its primary language.
2. Respond only with the ISO 639-1 two-letter language code (e.g., "en" for English, "es" for Spanish).
3. If the post is multilingual, identify the dominant language.
4. For very short posts or posts with limited linguistic content, respond with the most likely language based on available information.
5. If the language cannot be determined confidently, respond with "~~".
6. Do not provide any explanations, comments, or additional text in your response.

Example input: "Just posted my first Bluesky update! #NewToBluesky"
Expected output: en

Now, analyze the language of the following Bluesky post:

${text}`*/
            prompt: `I want you act as a language detector. I will type a text in any language and you will answer me in which language the text I wrote is in you. Do not write any explanations or other words, just reply with the two-letter language name (like "en"). (If it can be Czech or Slovak, choose Czech. Ignore context of the post in terms of determining the language, i.e. if it talks about Spain but the post is in English - correct is English). Text is:\n\n "${text}"`
        }),
    })
    const json = await resp.json()
    ollamaContext = json.context
    if (!json.done) {
        console.error(json)
        process.exit()
    }
    //}
    //return {}

    /*const resp = await fetch(url, {
        method: "post",
        body: JSON.stringify({
            model: "gemma2",
            stream: false,
            context: ollamaContext,
            prompt: text
        }),
    })
    const json = await resp.json()
    console.log(json)

    if (!json.done) {
        console.error(json)
    }*/
    return { langDetected: json.response.trim("\n").trim(), port }
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
            messages: [{ role: 'user', content: "What is the language of the following post? Please return only one 2-letter language code (do not explain which language is it) and do not write anything else (don't look at the content of the post in terms of determining the language, i.e. if it talks about Spanish but the post is in English - it is correctly in English):\n\n" + text }]
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

const start = Date.now()
let processed = 0

async function detect(post) {
    await locker()

    let { langDetected, port } = await detectOllama(post.text)
    if (!langDetected || !langDetected.match(/^[a-z]{2}$/)) {
        langDetected = "~~"
    }
    const res = db.query("update posts set langDetected=$langDetected where uri=$uri").run({ $uri: post.uri, $langDetected: langDetected })
    //console.log(db.query("select langDetected from posts where uri=$uri").get({ $uri: post.uri }))
    console.log(`[${port}] uri=${post.uri} [=${langDetected}] text=${post.text.replace(/\n/g, '').substring(0, 64)}`)
    //console.log(JSON.stringify(res))
    //}
    processed++
}

const where = "langDetected = 'uk'"
const { total } = db.query(`select count() as total from posts where ${where}`).get()

const limit = 64
while (true) {
    const posts = db.query(`select * from posts where ${where} order by createdAt asc limit 0, ${limit}`).all()

    await Promise.all(posts.sort((x, y) => x.text.length > y.text.length ? 1 : -1).map(p => detect(p)))
    /*for (const post of posts) {
        //await new Promise(r => setTimeout(r, 2000))
    }*/
    const elapsed = (Date.now() - start) / 1000
    const pps = processed / elapsed
    console.log(`---- ${elapsed}s elapsed --- ${pps} pps --- ${((Number(total - processed) / pps) / 60) / 60}h left (${total - processed})`)
    if (posts.length !== limit) {
        break
    }
}