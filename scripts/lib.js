export async function getPosts (uris) {
    const query = uris.map(u => `uris%5B%5D=${encodeURIComponent(u)}`).join('&')
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/app.bsky.feed.getPosts?${query}`, {
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`
        }
    })
    const json = await req.json()
    if (!json.posts) {
        console.log(json)
    }

    return { posts: json.posts, remainingLimit: req.headers.get('ratelimit-remaining') }
}


export async function getSearchPosts (q, limit = 100, cursor = 0) {
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=${limit}&cursor=${cursor}&sort=latest`, {
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`
        }
    })
    const json = await req.json()
    //console.log(json)
    if (!json.posts) {
        console.log(json)
    }

    return { posts: json.posts, remainingLimit: req.headers.get('ratelimit-remaining') }
}

export async function indexPosts (db, q, limit = 100, cursor = 0) {
    const insertedAuthors = []
    const inserted = []
    const { posts, remainingLimit } = await getSearchPosts(q, limit, cursor)
    for (const post of posts) {
        const exists = db.query('select uri from posts where uri=$uri').get({ $uri: post.uri })
        if (!exists && post.record) {
            db.query('insert into posts (uri, author, text, langs, createdAt, labels, likeCount, repostCount, replyCount, indexedAt) values ($uri, $author, $text, $langs, $createdAt, $labels, $likeCount, $repostCount, $replyCount, datetime("now"))').run({
                $uri: post.uri, $author: post.author.did, $text: post.record.text, $langs: post.record.langs?.join(','), $createdAt: post.record.createdAt, $labels: JSON.stringify(post.labels), $likeCount: post.likeCount, $repostCount: post.repostCount, $replyCount: post.replyCount
            })
            inserted.push(post.uri)
        }

        //console.log(post.author.handle)
        const userExists = db.query('SELECT * FROM users WHERE did=$did').get({ $did: post.author.did })
        if (!userExists) {
            db.query(`INSERT INTO users (handle, did, indexedAt) VALUES ($handle, $did, datetime('now'))`).run({ $handle: post.author.handle, $did: post.author.did })
            insertedAuthors.push(post.author.handle)
        }
    }
    const lastDate = posts[0]?.record.createdAt
    console.log(`[${q} ${cursor}] [len=${posts.length}] posts+${inserted.length} people+${insertedAuthors.length} {left=${remainingLimit}}`)

    return { insertedCount: inserted.length, lastDate }
}
