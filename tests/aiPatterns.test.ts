import test from "node:test";
import assert from "node:assert/strict";
import { assignPatterns } from "../src/lib/ai/patterns.ts";
import { buildStable, buildVariable, parseClips } from "../src/lib/ai/promptBuilder.ts";
import { costThb } from "../src/lib/ai/anthropic.ts";

test("patterns never repeat a pair or neighbour", () => {
  for (const off of [0, 3, 9]) {
    const p = assignPatterns(24, off);
    assert.equal(new Set(p.map((x) => x.format + "|" + x.hook)).size, 24);
    for (let i = 1; i < p.length; i++) assert.notEqual(p[i].format, p[i - 1].format);
  }
});

test("prompt: skips content_history body, keeps titles, includes selling lines", () => {
  const s = buildStable([{ key: "a", title: "กฎ", content: "RULE" }], { profile: "P", content_history: "SECRETHISTORY" }, ["1.01 x"]);
  assert.ok(s.includes("RULE") && s.includes("P") && s.includes("1.01 x"));
  assert.ok(!s.includes("SECRETHISTORY"));
  const v = buildVariable("script", { instruction: "", patterns: assignPatterns(2), sellingLines: ["ฟรีค่าส่ง"] });
  assert.ok(v.includes("ฟรีค่าส่ง") && v.includes("2 คลิป"));
});

test("parseClips + cost", () => {
  assert.equal(parseClips({ clips: [{ title: "a", script: "b", category: "x" }, { title: "", script: "c" }] }).length, 1);
  assert.ok(costThb("quality", { input_tokens: 40000, output_tokens: 45000 }) > 15);
});
