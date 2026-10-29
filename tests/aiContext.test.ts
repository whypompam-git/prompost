import assert from "node:assert/strict";
import { test } from "node:test";
import { contextGaps, isTemplateOnly, keyForFile, validateContextMap, validatePlaybooks } from "../src/lib/aiContext.ts";

test("files map to keys; _admin.md and unknown files are never imported", () => {
  assert.equal(keyForFile("profile.md"), "profile");
  assert.equal(keyForFile("personal-brand-9x9.md"), "personal_brand");
  assert.equal(keyForFile("client-content-direction.md"), "direction");
  assert.equal(keyForFile("_admin.md"), null);
  assert.equal(keyForFile("random.md"), null);
});

test("template-only files count as empty", () => {
  assert.equal(isTemplateOnly("# โปรไฟล์\n<!-- TODO: เติมข้อมูล -->\n"), true);
  assert.equal(isTemplateOnly("# โปรไฟล์\nร้านหมูกระทะ อสรมิตร เจ้าของพี่โอ้ เปิดมา 5 ปี"), false);
  assert.deepEqual(contextGaps({ profile: "ร้านหมูกระทะ อสรมิตร เจ้าของพี่โอ้ เปิดมา 5 ปี", brand_voice: "<!-- TODO -->" }).includes("โปรไฟล์ลูกค้า"), false);
  assert.equal(contextGaps({}).length, 6);
});

test("validation rejects unknown keys, non-strings and oversize text", () => {
  assert.equal(validateContextMap({ profile: "x" }).ok, true);
  assert.equal(validateContextMap({ _admin: "x" }).ok, false);
  assert.equal(validateContextMap({ profile: 5 }).ok, false);
  assert.equal(validateContextMap({ profile: "x".repeat(300_001) }).ok, false);
  assert.equal(validateContextMap([]).ok, false);
  assert.equal(validatePlaybooks([{ key: "script-writer", title: "กฎสคริปต์", content: "..." }]).ok, true);
  assert.equal(validatePlaybooks([{ key: "Bad Key", title: "x", content: "" }]).ok, false);
  assert.equal(validatePlaybooks([]).ok, false);
});
