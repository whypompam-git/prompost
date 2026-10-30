// node collect.js staff.js outsource.js > lines.json — every line the narrator says, as speechText() keys
const fs = require("fs");
const { speechText } = require("./tut.js");
const str = (s) => JSON.parse('"' + s + '"');
const lines = new Set();
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/t\.cap\(\s*"((?:[^"\\]|\\.)*)"/g)) lines.add(speechText(str(m[1])));
  for (const m of src.matchAll(/t\.chapter\(\s*(\d+),\s*"((?:[^"\\]|\\.)*)"/g)) lines.add(speechText(`บทที่ ${m[1]}. ${str(m[2]).replace(/"/g, "")}`));
  for (const m of src.matchAll(/say:\s*"((?:[^"\\]|\\.)*)"/g)) lines.add(speechText(str(m[1])));
}
process.stdout.write(JSON.stringify([...lines], null, 1));
