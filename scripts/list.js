import { Database } from "bun:sqlite"

const db = new Database("db.sqlite")

const list = "at://did:plc:rtlrfotcyulei426noqa6fhn/app.bsky.graph.list/3kwg2gjglsv2d";
const limit = 100

async function getListItems () {

    let cursor = ''
    let total = null
    const items = []
    process.stdout.write("loading list: ")

    while (true) {
        const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/app.bsky.graph.getList?list=${encodeURIComponent(list)}&limit=${limit}&cursor=${cursor}`, {
            headers: {
                Authorization: `Bearer ${process.env.BSKY_TOKEN}`
            }
        })
        const json = await req.json()
        //console.log(json)
        /*if (!json.list) {
            console.log(json)
            continue
        }*/
        items.push(...json.items)
        process.stdout.write(items.length + ' ')
        if (json.list.listItemCount) {
            total = json.list.listItemCount
        }

        if (total && items.length === total) {
            break
        }

        //console.log(json.list)
        cursor = json.cursor

        if (!cursor) {
            break
        }
    }
    console.log('\ntotal remote items: ' + total)
    return items
}

async function createItem (did) {
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/com.atproto.repo.createRecord`, {
        method: 'post',
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`,
            "content-type": 'application/json',
        },
        body: JSON.stringify({
            collection: "app.bsky.graph.listitem",
            record: {
                $type: "app.bsky.graph.listitem",
                createdAt: (new Date).toISOString(),
                list,
                subject: did,
            },
            repo: "did:plc:rtlrfotcyulei426noqa6fhn",
        })
    })
    const json = await req.json()
    if (!json.uri) {
        console.error(json)
    }
    //console.log(await req.json())
    return true
}

async function removeItem (rkey) {
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/com.atproto.repo.deleteRecord`, {
        method: 'post',
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`,
            "content-type": 'application/json',
        },
        body: JSON.stringify({
            collection: "app.bsky.graph.listitem",
            repo: "did:plc:rtlrfotcyulei426noqa6fhn",
            rkey,
        })
    })
    const json = await req.json()
    //console.log(json)
    //console.log(await req.json())
    return true
}


const listItems = await getListItems()
const dbUsers = db.query("select * from users where included = 1").all()

// add new
for (const du of dbUsers) {
    if (listItems.find(i => i.subject.did === du.did)) {
        process.stdout.write('.')
        continue
    }
    await createItem(du.did)
    process.stdout.write('+')
}
// remove old
for (const rli of listItems) {
    if (!dbUsers.find(u => u.did === rli.subject.did)) {
        const uriSplit = rli.uri.split('/')
        await removeItem(uriSplit[uriSplit.length-1])
        process.stdout.write('-')
    }
}

console.log("\ndone")