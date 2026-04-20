const Module = require('module')
console.log('builtins include electron:', Module.builtinModules.includes('electron'))
console.log('builtins:', Module.builtinModules.filter(m => m.includes('electron')))
// Try to get the real electron through a workaround
try {
  const { createRequire } = require('module')
  const req = createRequire(import.meta?.url || __filename)
  const e = req('electron')
  console.log('electron via createRequire:', typeof e)
} catch(e) { console.log('createRequire err:', e.message) }
process.exit(0)
