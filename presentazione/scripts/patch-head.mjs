import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const early = `    <script>
      (function () {
        var m = document.querySelector('meta[name="viewport"]');
        if (!m) {
          m = document.createElement('meta');
          m.name = 'viewport';
          document.head.insertBefore(m, document.head.firstChild);
        }
        m.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
        document.documentElement.style.width = '100%';
        document.documentElement.style.maxWidth = '100%';
      })();
    </script>
`

const marker = 'm.setAttribute('

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
  const fp = path.join(dir, f)
  let html = fs.readFileSync(fp, 'utf8')
  if (html.includes(marker)) {
    console.log('skip', f)
    continue
  }
  if (!html.includes('</style>')) {
    console.log('no style', f)
    continue
  }
  html = html.replace('</style>', '</style>\n' + early)
  fs.writeFileSync(fp, html)
  console.log('patched', f)
}
