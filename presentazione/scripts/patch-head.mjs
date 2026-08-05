import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const early = `    <script>
      (function () {
        var short = Math.min(screen.width || 0, screen.height || 0);
        var touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
        var phone = touch && short > 0 && short < 700;
        var m = document.querySelector('meta[name="viewport"]');
        if (!m) {
          m = document.createElement('meta');
          m.name = 'viewport';
          document.head.insertBefore(m, document.head.firstChild);
        }
        /* Su phone forza SEMPRE device-width (anche se Chrome ha “sito desktop”) */
        if (phone) {
          m.setAttribute(
            'content',
            'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover'
          );
          /* Se il layout resta da desktop, imponi la larghezza fisica */
          setTimeout(function () {
            var cw = document.documentElement.clientWidth || window.innerWidth;
            if (screen.width && cw > screen.width + 60) {
              m.setAttribute(
                'content',
                'width=' + screen.width + ', initial-scale=1, maximum-scale=5, viewport-fit=cover'
              );
            }
            document.documentElement.classList.add('is-phone');
          }, 0);
        } else {
          m.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
        }
        document.documentElement.style.width = '100%';
        document.documentElement.style.maxWidth = '100%';
        if (phone) document.documentElement.classList.add('is-phone');
      })();
    </script>
`

const startMark = '    <script>\n      (function () {\n        var m = document.querySelector'
const startMark2 = '    <script>\n      (function () {\n        var short = Math.min'

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
  const fp = path.join(dir, f)
  let html = fs.readFileSync(fp, 'utf8')

  // remove any previous bootstrap script after </style>
  html = html.replace(
    /<\/style>\s*<script>\s*\(function \(\) \{[\s\S]*?<\/script>\s*/m,
    '</style>\n',
  )

  if (!html.includes('</style>')) {
    console.log('no style', f)
    continue
  }

  html = html.replace('</style>', '</style>\n' + early)
  fs.writeFileSync(fp, html)
  console.log('patched', f)
}
