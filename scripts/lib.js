export async function getPosts(uris) {
    const query = uris.map(u => `uris%5B%5D=${encodeURIComponent(u)}`).join('&')
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/app.bsky.feed.getPosts?${query}`, {
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`
        }
    })
    const json = await req.json()
    if (!json.posts) {
        console.error(json)
    }

    return { posts: json.posts, remainingLimit: req.headers.get('ratelimit-remaining') }
}


export async function getSearchPosts(q, limit = 100, cursor = 0) {
    const startTime = performance.now();
    
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=${limit}&cursor=${cursor}&sort=latest`, {
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`
        }
    })
    const json = await req.json()
    if (!json.posts) {
        console.error(json)
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    return { 
        posts: json.posts, 
        remainingLimit: req.headers.get('ratelimit-remaining'),
        duration: Math.round(duration) // Duration in milliseconds
    }
}

export async function getAuthorPosts(actor, limit = 100, cursor = "") {
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}&filter=posts_with_replies&cursor=${cursor}`, {
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`
        }
    })
    const json = await req.json()
    if (!json.feed) {
        console.error(json)
    }
    const posts = json.feed.map(fp => fp.post).filter(p => p.author.handle === actor)
    return { posts, currentCursor: json.cursor, remainingLimit: req.headers.get('ratelimit-remaining') }
}

export async function indexPosts(db, q, limit = 100, cursor, method = "search") {
    const insertedAuthors = []
    const inserted = []
    const { posts, remainingLimit, currentCursor, duration } = method === "search" ? await getSearchPosts(q, limit, cursor) : await getAuthorPosts(q, limit, cursor)
    for (const post of posts) {
        const exists = db.query('select uri from posts where uri=$uri').get({ $uri: post.uri })
        if (!exists && post.record) {
            db.query('insert into posts (uri, author, text, langs, createdAt, labels, likeCount, repostCount, replyCount, indexedAt) values ($uri, $author, $text, $langs, $createdAt, $labels, $likeCount, $repostCount, $replyCount, datetime("now"))').run({
                $uri: post.uri, $author: post.author.did, $text: post.record.text, $langs: post.record.langs?.join(','), $createdAt: post.record.createdAt, $labels: JSON.stringify(post.labels), $likeCount: post.likeCount, $repostCount: post.repostCount, $replyCount: post.replyCount
            })
            inserted.push(post.uri)
        }

        const userExists = db.query('SELECT * FROM users WHERE did=$did').get({ $did: post.author.did })
        if (!userExists) {
            db.query(`INSERT INTO users (handle, did, indexedAt) VALUES ($handle, $did, datetime('now'))`).run({ $handle: post.author.handle, $did: post.author.did })
            insertedAuthors.push(post.author.handle)
        }
    }
    const lastDate = posts[0]?.record.createdAt
    console.log(`[${q} ${cursor || null}] [len=${posts.length} ${duration}ms] posts+${inserted.length} people+${insertedAuthors.length} {left=${remainingLimit},lastDate=${lastDate}}`)

    return { insertedCount: inserted.length, lastDate, currentCursor }
}

export async function locker() {
    let lockedState = null
    while (lockedState || lockedState === null) {
        const locked = await (Bun.file("./run.lock").exists())
        if (locked) {
            if (lockedState) {
                process.stdout.write('.')
            } else {
                process.stdout.write("\n[!] lock exists, sleeping: ")
            }
            lockedState = true
            await new Promise(r => setTimeout(r, 1000))
        } else {
            lockedState = false
        }
    }
}