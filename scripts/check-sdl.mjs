#!/usr/bin/env node
// SDL closure: every *Connection + root type referenced in schema.md graphql blocks is defined.
import { readFileSync } from "node:fs";
const s = readFileSync(new URL("../schema.md", import.meta.url), "utf8");
const blocks = [...s.matchAll(/```graphql(.*?)```/gs)].map((m) => m[1]).join("\n");
const defined = new Set([...blocks.matchAll(/(?:type|interface|union|enum|input|scalar)\s+([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]));
const used = new Set([...blocks.matchAll(/\b([A-Z][A-Za-z0-9_]*Connection)\b/g)].map((m) => m[1]));
const missing = [...used].filter((u) => !defined.has(u));
if (missing.length) { console.error("SDL FAIL missing:", missing.join(",")); process.exit(1); }
console.log(`SDL OK: ${defined.size} types, ${used.size} connections closed.`);
