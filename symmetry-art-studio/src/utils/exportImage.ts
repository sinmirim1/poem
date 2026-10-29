/**
 * 작품을 PNG 그림 파일로 저장하기
 *  1) 작품 SVG를 글자로 만든 뒤
 *  2) 그림(Image)으로 읽어 캔버스에 그리고
 *  3) PNG로 내려받는다.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Description, Doc } from '../types';
import { ArtworkSvg, FONT } from '../components/art/Artwork';
import { PAPER } from '../geometry/shapes';

export function artworkSvgString(doc: Doc): string {
  return renderToStaticMarkup(createElement(ArtworkSvg, { doc, prefix: 'ex' }));
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('그림을 만들지 못했어요'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('저장 실패'))), 'image/png'));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').trim();

/** 작품 그림만 PNG로 저장 */
export async function saveArtworkPng(doc: Doc, who: string) {
  const img = await loadSvgImage(artworkSvgString(doc));
  const canvas = document.createElement('canvas');
  canvas.width = PAPER.w;
  canvas.height = PAPER.h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, PAPER.w, PAPER.h);
  download(await toBlob(canvas), `대칭아트_${safeName(who) || '작품'}_${today()}.png`);
}

/** 글을 폭에 맞게 여러 줄로 나눈다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

export interface SheetInfo {
  styleName: string;
  lineCount: number;
  pointCount: number;
  sentences: string[];
}

/** 작품 + 설명이 함께 들어간 결과지 PNG (A4 세로 비율) */
export async function saveResultSheetPng(doc: Doc, desc: Description, info: SheetInfo) {
  const W = 1240;
  const H = 1754;
  const M = 80;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1d2a4d';
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText(desc.title ? `「${desc.title}」` : '대칭 아트 스튜디오 작품', M, M + 30);
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = '#4a5578';
  ctx.fillText(`${desc.klass ? desc.klass + '  ' : ''}${desc.name || ''}   ·   ${new Date().toLocaleDateString('ko-KR')}`, M, M + 80);

  const img = await loadSvgImage(artworkSvgString(doc));
  const iw = W - M * 2;
  const ih = (iw * PAPER.h) / PAPER.w;
  const top = M + 120;
  ctx.drawImage(img, M, top, iw, ih);
  ctx.strokeStyle = '#1d2a4d';
  ctx.lineWidth = 3;
  ctx.strokeRect(M, top, iw, ih);

  let y = top + ih + 60;
  ctx.font = `800 28px ${FONT}`;
  ctx.fillStyle = '#1d2a4d';
  ctx.fillText(`사조: ${info.styleName}    선대칭 도형: ${info.lineCount}개    점대칭 도형: ${info.pointCount}개`, M, y);
  y += 54;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillStyle = '#222';
  for (const s of info.sentences) {
    for (const l of wrap(ctx, '• ' + s, iw)) {
      if (y > H - M) break;
      ctx.fillText(l, M, y);
      y += 40;
    }
    y += 8;
  }
  download(await toBlob(canvas), `대칭아트_결과지_${safeName(desc.name) || '작품'}_${today()}.png`);
}
