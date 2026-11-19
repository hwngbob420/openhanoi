// Bọc an toàn tracery (Kate Compton, Apache-2.0; bản gốc ./tracery.js, https://github.com/galaxykate/tracery).
// Bản gốc là script cổ điển (dùng `this` toàn cục + arguments.callee) nên không chạy được ở chế độ strict của module:
// chạy nó trong Function() (sloppy) với `this` là đối tượng rời, thay jQuery.extend bằng Object.assign
// (chỗ duy nhất nó dùng `$`), lấy ra biến `tracery`, không chạm window.
import SRC from './tracery.js?raw'

const tracery = new Function('var $ = { extend: Object.assign };\n' + SRC + '\n;return tracery').call({})
export default tracery
