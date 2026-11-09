#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const login = process.env.GH_USERNAME || "iUjjwalRaj";
const output = process.env.OUTPUT_PATH || "data/contributions.json";
const endpoint = `https://github.com/users/${login}/contributions`;

function parseCalendar(html) {
  const counts = new Map();
  for (const match of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)</g)) {
    const contribution = match[2].match(/(\d+)\s+contribution/);
    counts.set(match[1], contribution ? Number(contribution[1]) : 0);
  }

  const days = [];
  for (const match of html.matchAll(/<td[^>]*class="ContributionCalendar-day"[^>]*>/g)) {
    const tag = match[0];
    const date = tag.match(/\bdata-date="([^"]+)"/)?.[1];
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const level = Number(tag.match(/\bdata-level="(\d)"/)?.[1] ?? 0);
    if (date && id) days.push({ date, count: counts.get(id) ?? 0, level });
  }
  if (days.length < 350) throw new Error(`Only parsed ${days.length} contribution days`);
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

const response = await fetch(endpoint, {
  headers: { "User-Agent": "iUjjwalRaj-profile-heatmap" },
});
if (!response.ok) throw new Error(`GitHub calendar returned HTTP ${response.status}`);

const days = parseCalendar(await response.text());
const destination = path.resolve(output);
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(
  destination,
  `${JSON.stringify({ login, source: endpoint, fetchedAt: new Date().toISOString(), days }, null, 2)}\n`,
  "utf8",
);
console.log(`Fetched ${days.length} public contribution days for ${login} -> ${output}`);
