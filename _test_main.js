const { app, BrowserWindow } = require('electron')
console.log('app:', typeof app)
console.log('BrowserWindow:', typeof BrowserWindow)

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 400, height: 300 })
  win.loadURL('data:text/html,<h1>Hello TaskForcer!</h1>')
  setTimeout(() => app.quit(), 3000)
})
