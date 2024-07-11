
console.log('[locking run]')
await Bun.write("run.lock", (new Date()).toISOString)