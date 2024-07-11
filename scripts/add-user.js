import { Database } from "bun:sqlite"

const db = new Database("db.sqlite")
const handle = Bun.argv[2]
if (!handle) {
    console.error(`Error: Invalid handle`)
    process.exit(1)
}

const resp = await fetch("https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=" + handle)
const json = await resp.json()
const did = json?.did
console.log({ did })

if (json.error) {
    console.error(json)
    process.exit(1)
}

const exists = db.query("select * from users where did=$did").get({ $did: did })
if (exists) {
    if (!exists.czechNational) {
        const out = db.query("update users set czechNational=1 where did=$did").run({ $did: did })
        console.log(out)
        console.log("Existed, setting czechNational done")
    } else {
        console.log("Existed and OK, nothing happens")
    }
} else {
    const out = db.query("INSERT INTO [users] ([handle], [did], [czechNational]) VALUES ($handle, $did, '1')").run({ $handle: handle, $did: did })
    console.log(out)
    console.log("Done. Added to database")
}