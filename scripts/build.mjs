// 번들 하나를 굽는다. 결과물은 저장소에 함께 커밋하므로
// 게임을 하는 쪽에서는 빌드가 필요 없다 — index.html 을 열면 그대로 돈다.
import { build, context } from 'esbuild'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const dev = process.argv.includes('--dev')
const watch = process.argv.includes('--watch')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/** @type {import('esbuild').BuildOptions} */
const opts = {
  entryPoints: ['src/main.ts'],
  outfile: 'dist/bundle.js',
  bundle: true,
  format: 'iife',
  target: ['es2022'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  legalComments: 'none',
  banner: { js: `/* ${pkg.description} · v${pkg.version} — built from src/, do not edit */` },
  logLevel: 'info',
}

/* 브라우저는 dist/bundle.js 를 파일 이름만 보고 캐시한다. 내용이 바뀌어도
   그대로 옛것을 쓰는 바람에 "고쳤는데 화면이 그대로" 가 반복됐다.
   내용 해시를 주소에 붙여, 바뀌면 반드시 새로 받게 한다. */
function stamp() {
  const h = f => createHash('sha1').update(readFileSync(new URL('../' + f, import.meta.url))).digest('hex').slice(0, 8)
  const js = h('dist/bundle.js'), css = h('src/style.css')
  const idx = new URL('../index.html', import.meta.url)
  let html = readFileSync(idx, 'utf8')
  html = html.replace(/(href="src\/style\.css)(\?v=[a-f0-9]+)?"/, `$1?v=${css}"`)
             .replace(/(src="dist\/bundle\.js)(\?v=[a-f0-9]+)?"/, `$1?v=${js}"`)
  writeFileSync(idx, html)
  console.log(`  stamped index.html  js=${js} css=${css}`)
}

if (watch) {
  const ctx = await context(opts)
  await ctx.watch()
  console.log('watching src/ …')
} else {
  await build(opts)
  stamp()
  await import('./checkinit.mjs')      // 순환 고리에서 undefined 가 될 코드를 막는다
}
