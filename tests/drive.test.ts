import assert from "node:assert/strict";
import { test } from "node:test";
import { socialEmbed, socialKind } from "../src/lib/drive.ts";

test("social links are recognised and get a player URL when the id is in the link", () => {
  assert.equal(socialKind("https://www.tiktok.com/@a/video/7300000000000000001"), "tiktok");
  assert.equal(socialEmbed("https://www.tiktok.com/@a/video/7300000000000000001"), "https://www.tiktok.com/embed/v2/7300000000000000001");
  assert.equal(socialEmbed("https://vt.tiktok.com/ZSabc/"), undefined); // short link: opens in the app
  assert.equal(socialEmbed("https://www.instagram.com/reel/C1abc_D/"), "https://www.instagram.com/reel/C1abc_D/embed");
  assert.equal(socialEmbed("https://youtu.be/abcdEFGhij1"), "https://www.youtube.com/embed/abcdEFGhij1");
  assert.match(socialEmbed("https://www.facebook.com/page/videos/12345")!, /plugins\/video\.php\?href=/);
  assert.equal(socialKind("https://drive.google.com/file/d/abcdefghij123/view"), undefined);
});
