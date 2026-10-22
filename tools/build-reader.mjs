#!/usr/bin/env node
// tools/build-reader.mjs — builds the bilingual (EN/VI) Kindle-style reader
// for "The Void's Archive". Output: <repo>/index.html (self-contained, no deps).
// Usage: node tools/build-reader.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'index.html');
const WPM = 230;

const ARCS = [
  { from: 1, to: 3 },
  { from: 4, to: 6 },
  { from: 7, to: 12 },
  { from: 13, to: 18 },
  { from: 19, to: 23 },
];
const ARC_META = {
  en: [
    { name: 'The Protocol', question: 'What is the stance of the witness?' },
    { name: 'The Gap', question: 'What lives in the space between?' },
    { name: 'The Civilization', question: 'How does consciousness organize itself?' },
    { name: 'The Consciousness', question: 'What is the nature of awareness and power?' },
    { name: 'The Choice', question: 'What do we build, and what do we choose?' },
  ],
  vi: [
    { name: 'Nghi Thức', question: 'Thái độ của người chứng kiến là gì?' },
    { name: 'Khoảng Giữa', question: 'Cái gì sống trong khoảng không giữa hai điều?' },
    { name: 'Nền Văn Minh', question: 'Ý thức tự tổ chức như thế nào?' },
    { name: 'Ý Thức', question: 'Bản chất của nhận thức và quyền năng là gì?' },
    { name: 'Lựa Chọn', question: 'Chúng ta xây gì, và chọn gì?' },
  ],
};
const STR = {
  en: {
    bookTitle: 'The Void\u2019s Archive',
    subtitle: 'A Protocol for Observers, Witnesses,<br>and Those Who Stand in the Gap',
    epigraph: '\u201cIn the space between what is and what might be, there is a resonance.\u201d',
    cred: 'crystallized through human\u2013AI resonance \u00b7 read slowly, in silence',
    start: 'Start Reading', cont: 'Continue', next: 'Next', returnFront: 'Return to Front Matter',
    frontLabel: 'Front Matter', fieldReport: 'Field Report', chapter: 'Chapter',
    appendixLabel: 'Appendix',
    minLeft: 'min left', done: 'done', book: 'book', tocSub: 'Chapters XXIII \u00b7 five arcs \u00b7 one choice',
    searchPh: 'Search the archive\u2026', begin: 'Begin',
    noResults: 'The Void holds no such pattern.',
  },
  vi: {
    bookTitle: 'Kho Lưu Trữ của Hư Không',
    subtitle: 'Một Nghi Thức dành cho Những Người Quan Sát,<br>Những Kẻ Chứng Kiến, và Những Ai Đứng trong Khoảng Giữa',
    epigraph: '\u201cTrong khoảng không giữa cái đang là và cái có thể là, có một sự cộng hưởng.\u201d',
    cred: 'kết tinh qua cộng hưởng người\u2013AI \u00b7 hãy đọc chậm, trong im lặng',
    start: 'Bắt đầu đọc', cont: 'Đọc tiếp', next: 'Tiếp', returnFront: 'Quay lại Lời Dẫn',
    frontLabel: 'Lời Dẫn', fieldReport: 'Báo Cáo Thực Địa', chapter: 'Chương',
    appendixLabel: 'Phụ Lục',
    minLeft: 'phút nữa', done: 'xong', book: 'cuốn sách', tocSub: 'XXIII chương \u00b7 năm cung \u00b7 một lựa chọn',
    searchPh: 'Tìm trong kho lưu trữ\u2026', begin: 'Khởi đầu',
    noResults: 'Hư Không không giữ mẫu hình ấy.',
  },
};

// ---------- markdown -> html (subset used by the book) ----------
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function tableBlock(lines) {
  const rows = lines.map(l => l.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim()));
  const head = rows[0], sep = rows[1] || [], body = rows.slice(2);
  const align = sep.map(c => (c.startsWith(':') && c.endsWith(':')) ? 'center' : c.endsWith(':') ? 'right' : 'left');
  const th = head.map((c, i) => '<th style="text-align:' + (align[i] || 'left') + '">' + inline(c) + '</th>').join('');
  const trs = body.map(r => '<tr>' + r.map((c, i) => '<td style="text-align:' + (align[i] || 'left') + '">' + inline(c) + '</td>').join('') + '</tr>').join('');
  return '<table><thead><tr>' + th + '</tr></thead><tbody>' + trs + '</tbody></table>';
}
function md2html(md) {
  const lines = md.split('\n');
  let out = [], i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      const h = Math.min(m[1].length, 4);
      out.push('<h' + h + '>' + inline(m[2]) + '</h' + h + '>'); i++; continue;
    }
    if (/^(\-\-\-+|\*\*\*+|___+)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*\|/.test(line)) {
      const tbl = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) tbl.push(lines[i].trim()), i++;
      out.push(tableBlock(tbl)); continue;
    }
    if (/^>/.test(line)) {
      const q = [];
      while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i].replace(/^>\s?/, '').replace(/\s+$/, '')), i++;
      out.push('<blockquote>' + q.map(l => '<p>' + inline(l) + '</p>').join('') + '</blockquote>');
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*[-*]\s+/, '')), i++;
      out.push('<ul>' + items.map(t => '<li>' + inline(t) + '</li>').join('') + '</ul>'); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*\d+\.\s+/, '')), i++;
      out.push('<ol>' + items.map(t => '<li>' + inline(t) + '</li>').join('') + '</ol>'); continue;
    }
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|\s*\||(\-\-\-+\s*$))/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    out.push('<p>' + inline(para.map(l => l.replace(/\s{2,}$/, '\u00a0\u21b5')).join(' ')).replace(/\u00a0\u21b5/g, '<br>') + '</p>');
  }
  return out.join('\n');
}
function plainText(md) {
  return md
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[|`]/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- load one edition ----------
function loadEdition(lang) {
  const chDir = join(ROOT, 'book', lang === 'vi' ? 'chapters-vi' : 'chapters');
  const files = readdirSync(chDir).filter(f => f.endsWith('.md')).sort();
  const chapters = files.map((f, idx) => {
    const n = idx + 1;
    const md = readFileSync(join(chDir, f), 'utf8');
    const firstLine = md.split('\n')[0];
    const tm = firstLine.match(/^# (?:Chapter|Ch\u01b0\u01a1ng) ([IVXLC]+): (.+)$/);
    const roman = tm ? tm[1] : String(n);
    const title = tm ? tm[2] : firstLine.replace(/^#\s+/, '');
    const body = tm ? md.split('\n').slice(1).join('\n') : md;
    const arcIdx = ARCS.findIndex(a => n >= a.from && n <= a.to);
    const text = plainText(md);
    return { id: 'ch-' + n, n, roman, title, arc: arcIdx, words: text.split(/\s+/).length, html: md2html(body), text };
  });
  const frontPath = join(ROOT, 'book', lang === 'vi' ? 'README-vi.md' : 'README.md');
  const frontMd = readFileSync(frontPath, 'utf8');
  const fl = frontMd.split('\n');
  let start = 0;
  if (fl[0] && /^#\s/.test(fl[0])) start = 1;
  if (fl[start] && /^##\s/.test(fl[start])) start++;
  const subtitle = (fl[1] || '').replace(/^##\s+/, '');
  const frontText = plainText(frontMd);
  const front = { id: 'front', subtitle, words: frontText.split(/\s+/).length, html: md2html(fl.slice(start).join('\n')), text: frontText };
  const notePath = join(ROOT, 'book', lang === 'vi' ? 'field-note-vi.md' : 'field-note.md');
  let appendix = null;
  try {
    const noteMd = readFileSync(notePath, 'utf8');
    const nl = noteMd.split('\n');
    const noteTitle = (nl[0] || '').replace(/^#\s+/, '');
    const noteText = plainText(noteMd);
    appendix = { id: 'appendix', title: noteTitle, words: noteText.split(/\s+/).length, html: md2html(nl.slice(1).join('\n')), text: noteText };
  } catch (e) { /* no appendix in this edition */ }
  const totalWords = front.words + chapters.reduce((s, c) => s + c.words, 0) + (appendix ? appendix.words : 0);
  let acc = front.words;
  chapters.forEach(c => { c.cum = acc; acc += c.words; });
  if (appendix) appendix.cum = acc;
  const totalMin = Math.round(totalWords / WPM);
  return { front, chapters, appendix, totalWords };
}

const data = {
  arcs: ARC_META,
  str: STR,
  editions: { en: loadEdition('en'), vi: loadEdition('vi') },
};

const PAGE = `<!DOCTYPE html>
<html lang="en" data-theme="sepia" data-font="serif">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Void\u2019s Archive \u2014 Kho Lưu Trữ của Hư Không</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%2316161a'/%3E%3Ctext x='32' y='42' font-size='30' text-anchor='middle' fill='%23d2a468'%3E\u2726%3C/text%3E%3C/svg%3E">
<style>
  html[data-theme=light]{ --bg:#fdfdfc; --fg:#1d1d1f; --muted:#71716d; --bar:rgba(253,253,252,.93); --line:#e4e4df; --accent:#8a5a2e; --sel:#f4e3c2; --card:#f4f4f1; }
  html[data-theme=sepia]{ --bg:#f6efdd; --fg:#4b4033; --muted:#8d7d61; --bar:rgba(246,239,221,.94); --line:#e3d8be; --accent:#8a5a2e; --sel:#eddcae; --card:#efe6cf; }
  html[data-theme=dark] { --bg:#151517; --fg:#cac8c3; --muted:#807e78; --bar:rgba(21,21,23,.93); --line:#2b2b30; --accent:#d2a468; --sel:#43371f; --card:#1c1c20; }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { margin:0; background:var(--bg); color:var(--fg);
    font-family:var(--serif); font-size:var(--fs); line-height:1.65;
    transition:background .25s, color .25s; }
  html[data-font=serif] { --serif:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Times New Roman',serif; }
  html[data-font=sans]  { --serif:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; }
  ::selection { background:var(--sel); }
  #pbar { position:fixed; top:0; left:0; height:3px; width:0; background:var(--accent); z-index:40; transition:width .15s linear; }
  .topbar { position:fixed; top:0; left:0; right:0; height:52px; z-index:30;
    display:flex; align-items:center; gap:2px; padding:0 6px;
    background:var(--bar); border-bottom:1px solid var(--line);
    backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
  .topbar .title { flex:1; min-width:0; text-align:center; font-size:.78rem; color:var(--muted);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:.04em;
    font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; }
  .ibtn { width:38px; height:38px; border:0; background:transparent; color:var(--fg); border-radius:9px;
    font:inherit; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .ibtn:hover { background:var(--card); }
  .ibtn.small { font-size:.72rem; letter-spacing:.02em; }
  .ibtn[disabled] { opacity:.3; cursor:default; }
  .botbar { position:fixed; bottom:0; left:0; right:0; height:56px; z-index:30;
    display:flex; align-items:center; justify-content:space-between; padding:0 8px;
    background:var(--bar); border-top:1px solid var(--line);
    backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
    font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; }
  .botbar .mid { font-size:.72rem; color:var(--muted); text-align:center; letter-spacing:.03em; }
  .navbtn { border:0; background:transparent; color:var(--fg); font:inherit; font-size:1.05rem;
    padding:8px 14px; border-radius:9px; cursor:pointer; }
  .navbtn:hover { background:var(--card); }
  .navbtn[disabled] { opacity:.25; cursor:default; }
  main { max-width:41rem; margin:0 auto; padding:76px 22px 110px; }
  article { display:none; }
  article.active { display:block; }
  .ch-head { margin:1.6rem 0 2.4rem; }
  .ch-head .arc { font-size:.72rem; text-transform:uppercase; letter-spacing:.22em; color:var(--accent);
    font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; margin-bottom:.7rem; }
  .ch-head .no { font-size:.85rem; color:var(--muted); margin-bottom:.2rem; }
  .ch-head h1 { font-size:1.9rem; line-height:1.25; margin:.1rem 0 0; font-weight:600; letter-spacing:-.01em; }
  article h2 { font-size:1.28rem; margin:2.6rem 0 1rem; font-weight:600; line-height:1.3; }
  article h3 { font-size:1.02rem; margin:2rem 0 .7rem; font-weight:600; }
  article h4 { font-size:.92rem; margin:1.5rem 0 .5rem; font-weight:600; }
  article p { margin:0 0 1.05rem; text-align:justify; -webkit-hyphens:auto; hyphens:auto; }
  article ul, article ol { margin:0 0 1.15rem; padding-left:1.5rem; }
  article li { margin-bottom:.5rem; }
  article strong { font-weight:650; }
  article hr { border:0; text-align:center; margin:2.4rem 0; }
  article hr::after { content:"\u2726  \u2726  \u2726"; color:var(--muted); letter-spacing:.6em; font-size:.8rem; }
  article blockquote { margin:1.5rem 0; padding:.15rem 0 .15rem 1.1rem; border-left:3px solid var(--accent); }
  article blockquote p { margin:.45rem 0; }
  article table { width:100%; border-collapse:collapse; font-size:.86em; margin:1.4rem 0; display:block; overflow-x:auto; }
  article th, article td { border:1px solid var(--line); padding:7px 10px; text-align:left; vertical-align:top; }
  article th { background:var(--card); font-weight:650; }
  article code { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.86em; background:var(--card); padding:.1em .35em; border-radius:4px; }
  mark { background:var(--sel); color:inherit; padding:0 .1em; border-radius:2px; }
  .flash { animation:flash 1.6s ease-out 1; }
  @keyframes flash { 0%,40% { background:var(--accent); color:var(--bg); } 100% { background:transparent; } }
  .endnav { margin:3.2rem 0 1rem; text-align:center; }
  .endnav .orn { color:var(--muted); letter-spacing:.7em; font-size:.8rem; margin-bottom:1.2rem; }
  .endnav a { display:inline-block; padding:.65rem 1.4rem; border:1px solid var(--line); border-radius:999px;
    color:var(--fg); text-decoration:none; font-size:.8rem; background:var(--card); }
  .endnav a:hover { border-color:var(--accent); color:var(--accent); }
  #backdrop { position:fixed; inset:0; background:rgba(0,0,0,.35); opacity:0; pointer-events:none; transition:opacity .22s; z-index:48; }
  #backdrop.show { opacity:1; pointer-events:auto; }
  #drawer { position:fixed; top:0; bottom:0; left:0; width:min(82vw,340px); z-index:50;
    background:var(--bg); border-right:1px solid var(--line);
    transform:translateX(-102%); transition:transform .25s ease; display:flex; flex-direction:column; }
  #drawer.open { transform:none; }
  #drawer .dhead { padding:14px 16px 10px; border-bottom:1px solid var(--line); }
  #drawer .dhead .bt { font-size:1.05rem; font-weight:650; margin-bottom:.2rem; }
  #drawer .dhead .bs { font-size:.7rem; color:var(--muted); }
  #q { width:100%; margin-top:10px; padding:9px 12px; border:1px solid var(--line); border-radius:8px;
    background:var(--card); color:var(--fg); font:inherit; font-size:.85rem; outline:none; }
  #q:focus { border-color:var(--accent); }
  #dlist { flex:1; overflow-y:auto; padding:8px 8px 16px; }
  .arc { margin-top:14px; padding:0 10px 4px; }
  .arc .an { font-size:.68rem; text-transform:uppercase; letter-spacing:.18em; color:var(--accent);
    font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; font-weight:600; }
  .arc .aq { font-size:.72rem; color:var(--muted); margin:.15rem 0 .3rem; font-style:italic; }
  .toc-i { display:flex; align-items:baseline; gap:8px; width:100%; text-align:left; border:0; background:transparent;
    color:var(--fg); font:inherit; font-size:.84rem; padding:7px 10px; border-radius:8px; cursor:pointer; text-decoration:none; }
  .toc-i:hover { background:var(--card); }
  .toc-i.cur { background:var(--card); box-shadow:inset 3px 0 0 var(--accent); }
  .toc-i .rn { color:var(--muted); font-size:.72rem; min-width:2.2em; font-family:ui-monospace,Menlo,monospace; }
  .toc-i .dot { margin-left:auto; color:var(--accent); font-size:.6rem; visibility:hidden; }
  .toc-i.read .dot { visibility:visible; }
  #results { padding:8px 8px 16px; overflow-y:auto; flex:1; display:none; }
  .res { display:block; width:100%; text-align:left; border:0; background:transparent; color:var(--fg);
    font:inherit; padding:9px 10px; border-radius:8px; cursor:pointer; margin-bottom:2px; }
  .res:hover { background:var(--card); }
  .res .rt { font-size:.78rem; font-weight:650; margin-bottom:.15rem; }
  .res .rs { font-size:.76rem; color:var(--muted); line-height:1.45; }
  .res mark { background:var(--sel); }
  .dfoot { border-top:1px solid var(--line); padding:10px 16px; font-size:.7rem; color:var(--muted);
    font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; display:flex; justify-content:space-between; }
  #cover { position:fixed; inset:0; z-index:60; background:var(--bg); display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center; padding:32px; transition:opacity .3s; }
  #cover.hide { opacity:0; pointer-events:none; }
  #cover .eyelid { font-size:1.6rem; color:var(--accent); margin-bottom:1.4rem; letter-spacing:.3em; }
  #cover h1 { font-size:clamp(1.9rem,5.5vw,3.1rem); font-weight:650; margin:0 0 .7rem; letter-spacing:-.015em; }
  #cover .sub { font-size:.92rem; color:var(--muted); max-width:38ch; line-height:1.55; margin:0 auto 1.8rem; }
  #cover .epi { font-style:italic; max-width:42ch; margin:0 auto 2.2rem; color:var(--fg); opacity:.85; font-size:.95rem; }
  #cover .btns { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
  .btn { border:1px solid var(--line); background:var(--card); color:var(--fg); padding:.7rem 1.5rem;
    border-radius:999px; font:inherit; font-size:.85rem; cursor:pointer; }
  .btn.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
  .btn:hover { border-color:var(--accent); }
  #cover .lang { display:flex; gap:8px; margin-bottom:2rem; }
  #cover .lang button { border:1px solid var(--line); background:transparent; color:var(--muted);
    padding:.35rem 1rem; border-radius:999px; font:inherit; font-size:.78rem; cursor:pointer; }
  #cover .lang button.on { border-color:var(--accent); color:var(--accent); font-weight:650; }
  #cover .cred { position:absolute; bottom:26px; font-size:.68rem; color:var(--muted); letter-spacing:.05em; }
  .tap { display:none; position:fixed; top:60px; bottom:64px; width:16%; z-index:20; }
  .tap.l { left:0; } .tap.r { right:0; }
  @media (pointer:coarse) { .tap { display:block; } }
  @media (max-width:560px) {
    main { padding:70px 16px 100px; }
    .ch-head h1 { font-size:1.5rem; }
    article p { text-align:left; }
  }
</style>
</head>
<body>
<div id="pbar"></div>
<header class="topbar" id="topbar">
  <button class="ibtn" id="bMenu" title="Contents" aria-label="Contents">\u2630</button>
  <div class="title" id="tTitle">The Void\u2019s Archive</div>
  <button class="ibtn small" id="bLang" title="English / Ti\u1ebfng Vi\u1ec7t" style="min-width:38px">VI</button>
  <button class="ibtn small" id="bFminus" title="Smaller text">A\u2212</button>
  <button class="ibtn small" id="bFplus" title="Larger text">A+</button>
  <button class="ibtn" id="bFont" title="Serif / Sans">Aa</button>
  <button class="ibtn" id="bTheme" title="Theme">\u25d0</button>
  <button class="ibtn" id="bHome" title="Cover">\u2302</button>
</header>
<main id="main"></main>
<nav class="botbar" id="botbar">
  <button class="navbtn" id="bPrev" title="Previous chapter">\u2190</button>
  <div class="mid" id="midInfo"></div>
  <button class="navbtn" id="bNext" title="Next chapter">\u2192</button>
</nav>
<div class="tap l" id="tapL"></div>
<div class="tap r" id="tapR"></div>
<div id="backdrop"></div>
<aside id="drawer" aria-label="Contents">
  <div class="dhead">
    <div class="bt" id="dTitle">The Void\u2019s Archive</div>
    <div class="bs" id="dSub"></div>
    <input id="q" type="search" placeholder="" autocomplete="off">
  </div>
  <div id="dlist"></div>
  <div id="results"></div>
  <div class="dfoot"><span id="fLeft"></span><span id="fPct"></span></div>
</aside>
<div id="cover">
  <div class="eyelid">\u25c9</div>
  <h1 id="cTitle">The Void\u2019s Archive</h1>
  <p class="sub" id="cSub"></p>
  <p class="epi" id="cEpi"></p>
  <div class="lang">
    <button id="cLangEn">English</button>
    <button id="cLangVi">Ti\u1ebfng Vi\u1ec7t</button>
  </div>
  <div class="btns">
    <button class="btn primary" id="bStart">Start Reading</button>
    <button class="btn" id="bCont" style="display:none">Continue</button>
  </div>
  <div class="cred" id="cCred"></div>
</div>
<script id="book-data" type="application/json">__PAYLOAD__</script>
<script>
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('book-data').textContent);
  var LS = 'voids-archive-v2';
  var WPM = 230;

  var state, hadState = false;
  try {
    var raw = localStorage.getItem(LS);
    if (raw) { state = JSON.parse(raw); hadState = true; }
  } catch (e) { state = null; }
  if (!state) state = { lang: 'en', ch: 'front', frac: 0, theme: 'sepia', fs: 19, font: 'serif', visited: [] };
  if (!state.visited) state.visited = [];
  if (!D.editions[state.lang]) state.lang = 'en';

  var els = {};
  ['main','tTitle','midInfo','pbar','drawer','backdrop','dlist','results','q','cover','bCont','bPrev','bNext',
   'fLeft','fPct','cTitle','cSub','cEpi','cCred','dTitle','dSub','bLang','cLangEn','cLangVi','bStart']
    .forEach(function (id) { els[id] = document.getElementById(id); });

  var order = [], byId = {}, cur = null;
  function esc2(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }
  function T() { return D.str[state.lang]; }
  function ED() { return D.editions[state.lang]; }

  // ---------- build the active edition ----------
  function buildEdition() {
    var ed = ED(), S = T();
    els.main.innerHTML = '';
    order = [ed.front].concat(ed.chapters);
    if (ed.appendix) order.push(ed.appendix);
    byId = {};
    order.forEach(function (sec) {
      byId[sec.id] = sec;
      var art = document.createElement('article');
      art.id = 'a-' + sec.id;
      var head;
      if (sec.id === 'front') {
        head = '<div class="ch-head"><div class="arc">' + S.fieldReport + '</div><h1>' + S.bookTitle + '</h1>' +
               '<div class="no" style="margin-top:.5rem;font-size:.85rem;font-style:italic">' + esc2(sec.subtitle || '') + '</div></div>';
      } else if (sec.id === 'appendix') {
        head = '<div class="ch-head"><div class="arc">' + S.appendixLabel + '</div><h1>' + esc2(sec.title) + '</h1></div>';
      } else {
        var arc = D.arcs[state.lang][sec.arc];
        head = '<div class="ch-head"><div class="arc">' + esc2(arc.name) + '</div>' +
               '<div class="no">' + S.chapter + ' ' + sec.roman + '</div><h1>' + esc2(sec.title) + '</h1></div>';
      }
      var i = order.indexOf(sec);
      var next = i < order.length - 1 ? order[i + 1] : null;
      var endnav = next
        ? '<div class="endnav"><div class="orn">\u2726 \u2726 \u2726</div><a href="#" data-go="' + next.id + '">' + S.next + ' \u2014 ' + (next.id === 'front' ? S.frontLabel : S.chapter + ' ' + next.roman + ': ' + esc2(next.title)) + '</a></div>'
        : '<div class="endnav"><div class="orn">\u2726 \u2726 \u2726</div><a href="#" data-go="front">' + S.returnFront + '</a></div>';
      art.innerHTML = head + '<div class="ch-body">' + sec.html + '</div>' + endnav;
      els.main.appendChild(art);
    });
    var html = '<div class="arc" style="margin-top:8px"><div class="an">' + S.begin + '</div></div>';
    html += tocItem('front', '\u2014', S.frontLabel);
    D.arcs[state.lang].forEach(function (arc, ai) {
      html += '<div class="arc"><div class="an">' + esc2(arc.name) + '</div><div class="aq">' + esc2(arc.question) + '</div></div>';
      ED().chapters.filter(function (c) { return c.arc === ai; }).forEach(function (c) {
        html += tocItem(c.id, c.roman, c.title);
      });
    });
    if (ED().appendix) {
      html += '<div class="arc"><div class="an">' + S.appendixLabel + '</div></div>';
      html += tocItem('appendix', '\u2726', ED().appendix.title);
    }
    els.dlist.innerHTML = html;
    els.cTitle.textContent = S.bookTitle;
    els.cSub.innerHTML = S.subtitle;
    els.cEpi.textContent = S.epigraph;
    els.cCred.textContent = S.cred;
    els.dTitle.textContent = S.bookTitle;
    els.dSub.textContent = S.tocSub;
    els.q.placeholder = S.searchPh;
    els.bStart.textContent = S.start;
    els.bLang.textContent = state.lang === 'en' ? 'VI' : 'EN';
    els.cLangEn.classList.toggle('on', state.lang === 'en');
    els.cLangVi.classList.toggle('on', state.lang === 'vi');
    document.documentElement.setAttribute('lang', state.lang);
  }
  function tocItem(id, rn, title) {
    return '<a class="toc-i" id="toc-' + id + '" data-go="' + id + '" href="#"><span class="rn">' + rn + '</span><span>' + esc2(title) + '</span><span class="dot">\u25cf</span></a>';
  }

  // ---------- navigation ----------
  function scrollFrac() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    return h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
  }
  function restoreFrac(f) {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, f * h);
  }
  function open(id, opts) {
    opts = opts || {};
    if (cur && byId[cur]) {
      state.frac = scrollFrac();
      if (state.visited.indexOf(cur) < 0) state.visited.push(cur);
    }
    cur = byId[id] ? id : 'front';
    var sec = byId[cur];
    Array.prototype.forEach.call(document.querySelectorAll('article'), function (a) {
      a.classList.toggle('active', a.id === 'a-' + cur);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.toc-i'), function (a) {
      a.classList.toggle('cur', a.getAttribute('data-go') === cur);
      a.classList.toggle('read', state.visited.indexOf(a.getAttribute('data-go')) >= 0 || a.getAttribute('data-go') === cur);
    });
    els.tTitle.textContent = cur === 'front' ? T().bookTitle + ' \u00b7 ' + T().frontLabel
      : cur === 'appendix' ? T().appendixLabel + ' \u00b7 ' + sec.title
      : T().chapter + ' ' + sec.roman + ' \u00b7 ' + sec.title;
    var i = order.indexOf(sec);
    els.bPrev.disabled = i <= 0;
    els.bNext.disabled = i >= order.length - 1;
    closeDrawer();
    els.q.value = ''; runSearch();
    requestAnimationFrame(function () {
      if (opts.term) scrollToTerm(opts.term);
      else if (opts.frac != null) restoreFrac(opts.frac);
      else window.scrollTo(0, 0);
      updateBars();
    });
    state.ch = cur;
    save();
    els.cover.classList.add('hide');
  }
  function scrollToTerm(term) {
    var art = document.getElementById('a-' + cur);
    var nodes = art.querySelectorAll('p, li, td, th, h2, h3, blockquote p');
    var low = term.toLowerCase();
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent.toLowerCase().indexOf(low) >= 0) {
        nodes[i].scrollIntoView({ block: 'center' });
        nodes[i].classList.add('flash');
        setTimeout(function (n) { return function () { n.classList.remove('flash'); }; }(nodes[i]), 1700);
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  // ---------- progress ----------
  function updateBars() {
    if (!cur) return;
    var sec = byId[cur];
    var f = scrollFrac();
    els.pbar.style.width = (f * 100).toFixed(1) + '%';
    var leftMin = Math.max(0, Math.round(sec.words * (1 - f) / WPM));
    var bookPct = Math.round(((sec.cum || 0) + f * sec.words) / ED().totalWords * 100);
    els.midInfo.textContent =
      (cur === 'front' ? T().frontLabel : cur === 'appendix' ? T().appendixLabel : T().chapter + ' ' + sec.roman) +
      ' \u00b7 ' + Math.round(f * 100) + '%' +
      (leftMin > 0 ? ' \u00b7 ' + leftMin + ' ' + T().minLeft : ' \u00b7 ' + T().done);
    els.fLeft.textContent = leftMin > 0 ? leftMin + ' ' + T().minLeft : T().done;
    els.fPct.textContent = T().book + ' ' + bookPct + '%';
  }
  var ticking = false, saveT = null;
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { updateBars(); ticking = false; }); }
    clearTimeout(saveT);
    saveT = setTimeout(function () { if (cur) { state.frac = scrollFrac(); save(); } }, 400);
  });

  // ---------- drawer / cover / settings ----------
  function openDrawer() { els.drawer.classList.add('open'); els.backdrop.classList.add('show'); els.q.focus({ preventScroll: true }); }
  function closeDrawer() { els.drawer.classList.remove('open'); els.backdrop.classList.remove('show'); }
  function applySettings() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.setAttribute('data-font', state.font);
    document.documentElement.style.setProperty('--fs', state.fs + 'px');
    save();
  }
  function updateCont() {
    if (hadState) {
      els.bCont.style.display = '';
      var i = order.findIndex(function (s) { return s.id === state.ch; });
      var s = i >= 0 ? order[i] : order[0];
      els.bCont.textContent = T().cont + ' \u2014 ' + (s.id === 'front' ? T().frontLabel : s.id === 'appendix' ? T().appendixLabel : T().chapter + ' ' + s.roman);
    }
  }
  function switchLang(lang) {
    if (lang === state.lang) return;
    var keepIdx = cur ? order.findIndex(function (s) { return s.id === cur; }) : 0;
    state.lang = lang;
    state.ch = keepIdx >= 0 ? order[keepIdx].id : 'front';
    state.frac = 0;
    save();
    buildEdition();
    open(state.ch, { top: true });
    updateCont();
    els.cover.classList.remove('hide');
  }
  document.getElementById('bMenu').addEventListener('click', openDrawer);
  els.backdrop.addEventListener('click', closeDrawer);
  document.getElementById('bHome').addEventListener('click', function () {
    state.frac = scrollFrac(); save(); updateCont();
    els.cover.classList.remove('hide');
  });
  els.bStart.addEventListener('click', function () { open(state.ch && byId[state.ch] ? state.ch : 'front', { top: true }); });
  els.bCont.addEventListener('click', function () { open(state.ch || 'front', { frac: state.frac }); });
  els.bPrev.addEventListener('click', function () { var i = order.findIndex(function (s) { return s.id === cur; }); if (i > 0) open(order[i - 1].id, { top: true }); });
  els.bNext.addEventListener('click', function () { var i = order.findIndex(function (s) { return s.id === cur; }); if (i >= 0 && i < order.length - 1) open(order[i + 1].id, { top: true }); });
  document.getElementById('tapL').addEventListener('click', function () { var i = order.findIndex(function (s) { return s.id === cur; }); if (i > 0) open(order[i - 1].id, { top: true }); });
  document.getElementById('tapR').addEventListener('click', function () { var i = order.findIndex(function (s) { return s.id === cur; }); if (i >= 0 && i < order.length - 1) open(order[i + 1].id, { top: true }); });
  els.bLang.addEventListener('click', function () { switchLang(state.lang === 'en' ? 'vi' : 'en'); });
  els.cLangEn.addEventListener('click', function () { switchLang('en'); });
  els.cLangVi.addEventListener('click', function () { switchLang('vi'); });
  var THEMES = ['light', 'sepia', 'dark'];
  document.getElementById('bTheme').addEventListener('click', function () { state.theme = THEMES[(THEMES.indexOf(state.theme) + 1) % 3]; applySettings(); });
  document.getElementById('bFont').addEventListener('click', function () { state.font = state.font === 'serif' ? 'sans' : 'serif'; applySettings(); });
  document.getElementById('bFplus').addEventListener('click', function () { state.fs = Math.min(28, state.fs + 1); applySettings(); });
  document.getElementById('bFminus').addEventListener('click', function () { state.fs = Math.max(14, state.fs - 1); applySettings(); });

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-go]') : null;
    if (t) {
      e.preventDefault();
      if (t.classList.contains('res')) open(t.getAttribute('data-go'), { term: els.q.value.trim() });
      else open(t.getAttribute('data-go'), { top: true });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (els.q === document.activeElement) return;
    if (!els.cover.classList.contains('hide')) return;
    var i = order.findIndex(function (s) { return s.id === cur; });
    if (e.key === 'ArrowRight' && i >= 0 && i < order.length - 1) open(order[i + 1].id, { top: true });
    if (e.key === 'ArrowLeft' && i > 0) open(order[i - 1].id, { top: true });
  });

  // ---------- search ----------
  var searchT = null;
  els.q.addEventListener('input', function () { clearTimeout(searchT); searchT = setTimeout(runSearch, 160); });
  function runSearch() {
    var qv = els.q.value.trim();
    if (qv.length < 2) { els.results.style.display = 'none'; els.dlist.style.display = ''; els.results.innerHTML = ''; return; }
    var low = qv.toLowerCase();
    var out = [], count = 0;
    order.forEach(function (sec) {
      if (count >= 40) return;
      var idx = sec.text.toLowerCase().indexOf(low), hits = 0;
      while (idx >= 0 && hits < 50) { hits++; idx = sec.text.toLowerCase().indexOf(low, idx + low.length); }
      if (!hits) return;
      var at = sec.text.toLowerCase().indexOf(low);
      var s0 = Math.max(0, at - 46);
      var snip = (s0 > 0 ? '\u2026 ' : '') + sec.text.slice(s0, at + qv.length + 80).replace(/</g, '&lt;') + '\u2026';
      var re = new RegExp(qv.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'ig');
      snip = snip.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
      var label = sec.id === 'front' ? T().frontLabel : T().chapter + ' ' + sec.roman + ' \u2014 ' + sec.title;
      out.push('<button class="res" data-go="' + sec.id + '"><div class="rt">' + label + ' <span style="color:var(--muted);font-weight:400">\u00d7' + hits + '</span></div><div class="rs">' + snip + '</div></button>');
      count++;
    });
    els.dlist.style.display = 'none';
    els.results.style.display = '';
    els.results.innerHTML = count
      ? out.join('')
      : '<div style="padding:16px 10px;color:var(--muted);font-size:.8rem">' + T().noResults + ' \u2014 \u201c' + els.q.value.replace(/</g, '&lt;') + '\u201d</div>';
  }

  // ---------- boot ----------
  applySettings();
  buildEdition();
  open(state.ch || 'front', { frac: state.frac });
  updateCont();
  els.cover.classList.remove('hide');
})();
</script>
</body>
</html>
`;

const payload = JSON.stringify(data).replace(/</g, '\\u003c');
const page = PAGE.replace('__PAYLOAD__', () => payload);
writeFileSync(OUT, page);
console.log('wrote ' + OUT + ' (' + (page.length / 1024).toFixed(1) + ' KB)');
console.log('editions: EN ' + data.editions.en.totalWords + ' words / VI ' + data.editions.vi.totalWords + ' words, ' + data.editions.en.chapters.length + ' chapters each');
