import fs from 'node:fs'
const html = fs.readFileSync('prototipo/app.html', 'utf8').replace('<!--PONTE-->', '<script src="./ponte.iife.js"></script>')
fs.writeFileSync('dist/index.html', html)
console.log('dist/index.html montado (' + (html.length / 1e6).toFixed(1) + ' MB)')
