import { unlinkSync } from "node:fs"

unlinkSync("./run.lock")
console.log('[run unlocked]')
