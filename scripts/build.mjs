// 번들 하나를 굽는다. 결과물은 저장소에 함께 커밋하므로
// 게임을 하는 쪽에서는 빌드가 필요 없다 — index.html 을 열면 그대로 돈다.
import { build, context } from 'esbuild'
import { readFileSync } from 'node:fs'

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

if (watch) {
  const ctx = await context(opts)
  await ctx.watch()
  console.log('watching src/ …')
} else {
  await build(opts)
}
