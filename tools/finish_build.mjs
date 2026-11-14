// vite build xuất dist/index.html (đã nhúng hết) -> đổi tên thành dist/hanoi-pixel.html
import fs from 'node:fs'
fs.renameSync('dist/index.html', 'dist/hanoi-pixel.html')
console.log('dist/hanoi-pixel.html  ' + (fs.statSync('dist/hanoi-pixel.html').size / 1048576).toFixed(2) + ' MB')
