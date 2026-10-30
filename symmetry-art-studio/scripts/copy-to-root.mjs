// 빌드된 한 파일짜리 앱을 저장소 맨 위 폴더로 복사한다.
// (다른 수업 자료처럼 더블클릭으로 바로 열 수 있게)
// GitHub Pages용 폴더(symmetry-art-pages)가 있으면 그곳의 index.html도 함께 바꾼다.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', 'dist', 'index.html');
const to = join(here, '..', '..', '대칭아트스튜디오.html');
copyFileSync(from, to);
console.log(`복사 완료: ${to}`);

const pagesDir = join(here, '..', '..', 'symmetry-art-pages');
if (existsSync(pagesDir)) {
  const pagesTo = join(pagesDir, 'index.html');
  copyFileSync(from, pagesTo);
  console.log(`GitHub Pages용 복사 완료: ${pagesTo}`);
}
