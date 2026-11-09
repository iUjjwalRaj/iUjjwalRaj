#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const input = process.env.INPUT_PATH || "data/contributions.json";
const output = process.env.OUTPUT_SVG || "assets/contribution-heatmap.svg";
const data = JSON.parse(await fs.readFile(path.resolve(input), "utf8"));
const days = data.days.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date)).sort((a, b) => a.date.localeCompare(b.date));
if (days.length < 350) throw new Error(`Expected at least 350 days, found ${days.length}`);

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[character]));
const dateValue = (value) => new Date(`${value}T00:00:00Z`);
const lastYearStart = dateValue(days.at(-1).date);
lastYearStart.setUTCDate(lastYearStart.getUTCDate() - 364);
const yearDays = days.filter((day) => dateValue(day.date) >= lastYearStart);
const total = yearDays.reduce((sum, day) => sum + day.count, 0);
const activeDays = yearDays.filter((day) => day.count > 0).length;
let longest = 0;
let current = 0;
for (const day of yearDays) {
  current = day.count > 0 ? current + 1 : 0;
  longest = Math.max(longest, current);
}
const busiest = yearDays.reduce((best, day) => day.count > best.count ? day : best, yearDays[0]);

const cells = days.slice(-371);
while (cells.length < 371) cells.unshift({ date: "", count: 0, level: 0 });
const cellWidth = 16;
const gap = 4;
const gridX = 72;
const gridY = 108;
const gridHeight = 7 * (cellWidth + gap) - gap;
const colors = ["#1D2330", "#8B7CFF", "#9E91E8", "#B8A7C6", "#D6B779"];
const rects = cells.map((day, index) => {
  const column = Math.floor(index / 7);
  const row = index % 7;
  const x = gridX + column * (cellWidth + gap);
  const y = gridY + row * (cellWidth + gap);
  return `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellWidth}" rx="3" fill="${colors[Math.min(day.level, 4)]}" data-date="${escape(day.date)}" data-count="${day.count}"/>`;
}).join("");

const months = [];
let previousMonth = "";
for (let column = 0; column < 53; column += 1) {
  const day = cells[column * 7];
  if (!day.date) continue;
  const month = day.date.slice(0, 7);
  if (month === previousMonth) continue;
  previousMonth = month;
  months.push(`<text x="${gridX + column * (cellWidth + gap)}" y="94">${escape(dateValue(day.date).toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase())}</text>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 330" role="img" aria-labelledby="urhg-title urhg-desc">
  <title id="urhg-title">Ujjwal Raj public GitHub contribution activity</title>
  <desc id="urhg-desc">${escape(total)} contributions across ${escape(activeDays)} active days in the last year. Longest streak ${escape(longest)} days. Busiest day ${escape(busiest.date)} with ${escape(busiest.count)} contributions.</desc>
  <defs>
    <linearGradient id="urhg-border" x1="0" x2="1"><stop stop-color="#D6B779" stop-opacity=".55"/><stop offset="1" stop-color="#8B7CFF" stop-opacity=".45"/></linearGradient>
    <linearGradient id="urhg-sweep"><stop stop-color="#F2F1ED" stop-opacity="0"/><stop offset=".5" stop-color="#F2F1ED" stop-opacity=".16"/><stop offset="1" stop-color="#F2F1ED" stop-opacity="0"/></linearGradient>
    <clipPath id="urhg-clip"><rect x="${gridX}" y="${gridY}" width="1112" height="${gridHeight}" rx="4"/></clipPath>
  </defs>
  <style>
    .urhg-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
    .urhg-serif{font-family:Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif}
    .urhg-cell{animation:urhg-cell 1s cubic-bezier(.16,1,.3,1) both}
    .urhg-sweep{animation:urhg-sweep 7s ease-in-out 1s infinite}
    @keyframes urhg-cell{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    @keyframes urhg-sweep{from{transform:translateX(-280px)}to{transform:translateX(1400px)}}
    @media(prefers-reduced-motion:reduce){.urhg-cell{animation:none}.urhg-sweep{animation:none;display:none}}
  </style>
  <rect width="1200" height="330" rx="18" fill="#090B10" stroke="url(#urhg-border)"/>
  <text class="urhg-mono" x="48" y="40" fill="#80CFFF" font-size="11" letter-spacing="3">PUBLIC ACTIVITY / LAST YEAR / ${escape(data.login.toUpperCase())}</text>
  <g class="urhg-mono" fill="#F2F1ED">
    <text x="48" y="74" font-size="25">${escape(total)} <tspan fill="#D6B779" font-size="11" letter-spacing="1.5">TOTAL</tspan></text>
    <text x="230" y="74" font-size="25">${escape(activeDays)} <tspan fill="#D6B779" font-size="11" letter-spacing="1.5">ACTIVE DAYS</tspan></text>
    <text x="470" y="74" font-size="25">${escape(longest)} <tspan fill="#D6B779" font-size="11" letter-spacing="1.5">LONGEST STREAK</tspan></text>
    <text x="760" y="74" font-size="25">${escape(busiest.count)} <tspan fill="#D6B779" font-size="11" letter-spacing="1.5">BUSIEST / ${escape(busiest.date)}</tspan></text>
  </g>
  <g class="urhg-mono" fill="#80CFFF" font-size="10" letter-spacing="1.2">${months.join("")}</g>
  <g class="urhg-cell">${rects}</g>
  <g clip-path="url(#urhg-clip)"><rect class="urhg-sweep" x="0" y="${gridY}" width="240" height="${gridHeight}" fill="url(#urhg-sweep)"/></g>
  <g class="urhg-mono" font-size="10" fill="#8B7CFF"><text x="72" y="288">LESS</text><rect x="112" y="277" width="14" height="14" rx="3" fill="#1D2330"/><rect x="132" y="277" width="14" height="14" rx="3" fill="#8B7CFF"/><rect x="152" y="277" width="14" height="14" rx="3" fill="#9E91E8"/><rect x="172" y="277" width="14" height="14" rx="3" fill="#B8A7C6"/><rect x="192" y="277" width="14" height="14" rx="3" fill="#D6B779"/><text x="214" y="288">MORE</text></g>
</svg>
`;

const outputPath = path.resolve(output);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, svg, "utf8");
data.stats = { total, activeDays, longestStreak: longest, busiestDay: busiest };
data.generatedAt = new Date().toISOString();
await fs.writeFile(path.resolve(input), `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Rendered ${output} (${total} contributions, ${activeDays} active days, ${longest}-day streak)`);
