import { Database } from "bun:sqlite";
import { $ } from 'bun';

const db = new Database("db.sqlite")

const dbNewFile = "langdb.sqlite"
const dbNew = new Database(dbNewFile)
const limit = 10000
let i = 0

dbNew.query("PRAGMA journal_mode=WAL;").run()
dbNew.query("PRAGMA synchronous = normal;").run()
dbNew.query("PRAGMA temp_store = memory;").run()
dbNew.query("PRAGMA mmap_size = 30000000000;").run()

dbNew.query("DROP TABLE posts;").run()
dbNew.query(`CREATE TABLE [posts] ( 
                [uri] VARCHAR(250) NULL,
                [text] TEXT NULL,
                [langDetected] VARCHAR(250) NULL,
                CONSTRAINT [uri] PRIMARY KEY ([uri])
            );
            CREATE UNIQUE INDEX [langDetected] 
            ON [posts] (
                [langDetected] ASC
            );
`).run();

while (true) {
    const posts = db.query(`select uri, text, langDetected from posts limit ${i}, ${limit}`).all()

    //dbNew.query("DELETE FROM posts;").run()

    for (const p of posts) {
        dbNew.query("insert into posts (uri, text, langDetected) values ($uri, $text, $langDetected)").run({ $uri: p.uri, $text: p.text, $langDetected: p.langDetected })
        i++
    }
    if (i % 100 === 0) {
        //const { total } = dbNew.query("select count() as total from posts").get()
        console.log(i, "processed")
    }
    if (posts.length !== limit) {
        break
    }
}
console.log(`done, db updated: ${dbNewFile}`)