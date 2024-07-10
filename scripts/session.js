

const req = await fetch(`https://bsky.social/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: {
        "content-type": "application/json"
    },
    body: JSON.stringify({
        identifier: process.env.BSKY_USERNAME,
        password: process.env.BSKY_PASSWORD,
    })
})

const session = await req.json()
const envFile = Bun.file("./.env")
const env = await envFile.text()
const newEnv = env.replace(/BSKY_TOKEN=[^\n]+/, 'BSKY_TOKEN=' + session.accessJwt)
await Bun.write(envFile, newEnv)
console.log('done', session.accessJwt)