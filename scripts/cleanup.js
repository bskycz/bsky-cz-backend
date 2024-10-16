import { join } from "node:path";
import { readdir, unlink } from "node:fs/promises";
import { differenceInMinutes } from "date-fns";

const bundleDir = "../dist/bundles"
const files = (await readdir(bundleDir)).sort();

let prev = new Date('2024-07-11T00:00');
for (const f of files) {
	const m = f.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z).json.zst/)
	if (!m) {
		continue
	}
	const date = new Date(m[1])
	const diff = differenceInMinutes(date, prev)
	const toDelete = diff < 60
	console.log((toDelete ? '-' : '+') + ' ' + JSON.stringify({ f, diff, toDelete }))
	if (toDelete) {
		const fn = join(bundleDir, f)
		await unlink(fn)
		console.log('DELETE '+fn)
	} else {
		prev = date
	}
}
