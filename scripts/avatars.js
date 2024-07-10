import { Database } from "bun:sqlite";
import { $ } from "bun";

const db = new Database("db.sqlite")
const OUTPUT_DIR = "./dist/avatars"

const users = db.query("select * from users where (included=1 or (czechNational=1 and optout!=1 and deleted!=1))").all()
for (const user of users) {
    if (user.avatar) {
        const ffn = user.avatar.match(/(did:plc.+)/)[0].split('@').join('.').replace('/', '-')
        const fn = OUTPUT_DIR + "/original/" + ffn
        const f = Bun.file(fn)
        if (await f.exists()) {
            process.stdout.write('@')
        } else {
            const avatar = await fetch(user.avatar)
            await Bun.write(fn, avatar)
            process.stdout.write('.')
        }
        const fwe = user.did + ".avif"
        const tfn = OUTPUT_DIR + "/thumb/" + fwe
        if (!await (Bun.file(tfn)).exists()) {
            await $`/usr/bin/convert ${fn} -resize 200x200^ -gravity center -extent 200x200 ${tfn}`
        }
    }
}
console.log("\ndone")