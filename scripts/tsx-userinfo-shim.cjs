const os = require('node:os')

try {
  os.userInfo()
} catch {
  const username = process.env.USERNAME || process.env.USER || 'codex'
  os.userInfo = () => ({ username })
}
