import { Database } from "bun:sqlite";

const db = new Database("db.sqlite")

async function getProfiles(users) {

    const query = users.map(u => `actors%5B%5D=${u.did}`).join('&')
    const req = await fetch(`https://${process.env.BSKY_PDS}/xrpc/app.bsky.actor.getProfiles?${query}`, {
        headers: {
            Authorization: `Bearer ${process.env.BSKY_TOKEN}`
        }
    })
    const json = await req.json()

    if (!json.profiles) {
        return null
    }

    for (const profile of json.profiles) {
        db.query("update users set handle=$handle, followers=$followers, posts=$posts, follows=$follows, createdAt=$createdAt, displayName=$displayName, posts=$posts, labels=$labels, avatar=$avatar, description=$description, profileLastUpdated=datetime('now') where did = $did").run({
            $handle: profile.handle,
            $did: profile.did,
            $followers: profile.followersCount,
            $follows: profile.followsCount,
            $displayName: profile.displayName,
            $createdAt: profile.createdAt,
            $posts: profile.postsCount,
            $avatar: profile.avatar,
            $labels: JSON.stringify(profile.labels),
            $description: profile.description || 'NULL'
        })
    }
}

let total = 0
while (true) {
    const users = db.query("select handle, did, profileLastUpdated from users where (profileLastUpdated is NULL or (((included = 1 or czechNational = 1) AND (julianday('now') - julianday(profileLastUpdated)) * 24 > 1) OR (included = 0 AND (julianday('now') - julianday(profileLastUpdated)) > 1))) and deleted = 0 limit 25").all()

    if (users.length === 0) {
        console.log('Done')
        break
    }

    console.log(total, users.map(u => u.handle).join(', '))
    await getProfiles(users)

    await new Promise(r => setTimeout(r, 100))
    total += 25
}


