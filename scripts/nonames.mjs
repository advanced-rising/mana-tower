/* 없는 이름을 쓴 자리를 잡는다.
   esbuild 는 모르는 이름을 전역 참조로 두고 조용히 넘어간다. 임포트를 빠뜨리면
   번들은 멀쩡히 만들어지고 스모크도 지나간다 — 첫 화면은 멀쩡하니까. 대신 그 이름을
   쓰는 패널의 updater 만 매 프레임 터진다. refresh() 가 예외를 삼키므로 콘솔을 열지
   않는 한 아무 표시도 없고, 그 패널의 숫자는 굳고 라벨은 빈 채로 남는다.
   여태 네 번 물렸다: addManaLog, soulGainLog, chalGoalLog, budget2Log.
   tsc 의 TS2304 가 정확히 이 부류다 — 다른 타입 오류는 보지 않고 이것만 본다. */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const ROOT = new URL('..', import.meta.url).pathname
let out=''
try{ await run('npx',['tsc','--noEmit'],{cwd:ROOT,maxBuffer:64*1024*1024}) }
catch(e){ out=(e.stdout||'')+(e.stderr||'') }
const bad = out.split('\n').filter(l=>/error TS(2304|2552)\b/.test(l))
if(bad.length){
  console.error(`  없는 이름 ${bad.length}건 — 임포트를 빠뜨렸다. 번들을 굽지 않는다.`)
  for(const l of bad.slice(0,20)) console.error('    '+l.trim())
  process.exit(1)
}
console.log('  없는 이름: 0건')
