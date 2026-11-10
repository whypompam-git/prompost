import test from "node:test";
import assert from "node:assert/strict";
import { assignCtas, assignPatterns } from "../src/lib/ai/patterns.ts";
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
  const s = buildStable([{ key: "a", title: "กฎ", content: "RULE" }], { profile: "P", content_history: "SECRETHISTORY" }, [{ title: "1.01 x", hook: "H1", cta: "C1" }]);
  assert.ok(s.includes("RULE") && s.includes("P") && s.includes("1.01 x"));
  assert.ok(!s.includes("SECRETHISTORY"));
  const v = buildVariable("script", { instruction: "", patterns: assignPatterns(2), sellingLines: ["ฟรีค่าส่ง"] });
  assert.ok(v.includes("ฟรีค่าส่ง") && v.includes("2 คลิป"));
});

test("parseClips + cost", () => {
  assert.equal(parseClips({ clips: [{ title: "a", script: "b", category: "x" }, { title: "", script: "c" }] }).length, 1);
  assert.ok(costThb("quality", { input_tokens: 40000, output_tokens: 45000 }) > 15);
});

test("CTA types rotate and follow the category", () => {
  const sell = assignCtas(4, "sell");
  assert.ok(sell[0] !== sell[1] && sell[1] !== sell[2]);
  assert.ok(assignCtas(2, "mass").every((c) => !c.includes("สั่งเลย")));
  assert.equal(assignCtas(3).length, 3);
});

test("prompt carries recent hooks/CTAs, hook + CTA rules and locked topics", () => {
  const s = buildStable([], {}, [{ title: "1.01 x", hook: "ฮุกเดิม", cta: "ซีทีเอเดิม" }]);
  assert.ok(s.includes("ฮุกเดิม") && s.includes("ซีทีเอเดิม"));
  const v = buildVariable("script", { instruction: "", patterns: assignPatterns(1).map((p) => ({ ...p, cta: "ทักไลน์" })), sellingLines: [], topics: [{ angle: "มุมA", problem: "ปัญหา", gives: "ได้" }] });
  assert.ok(v.includes("มุมA") && v.includes("กฎ Hook") && v.includes("กฎ CTA") && v.includes("ทักไลน์"));
});
