import fs from 'node:fs';

// Replace selected JSON values in place: preserve whitespace, key order, escapes,
// line endings and all unrelated text instead of serializing the whole manifest.
const [file, ...arguments_] = process.argv.slice(2);
const original = fs.readFileSync(file, 'utf8');
const bom = original.startsWith('\uFEFF') ? '\uFEFF' : '';
const text = original.slice(bom.length);
JSON.parse(text);
const updates = new Map();
for (const argument of arguments_) {
  const separator = argument.indexOf('=');
  const key = argument.slice(0, separator);
  if (separator < 0 || !['version', 'dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].includes(key)) {
    throw new Error(`Unsupported manifest update: ${argument}`);
  }
  const path = key === 'version' ? ['version'] : [key, '@neuroinfoapi-client/core'];
  updates.set(JSON.stringify(path), argument.slice(separator + 1));
}
let position = 0;
const edits = [];
const whitespace = () => { while (/\s/.test(text[position] ?? '') && position < text.length) position++; };
function string() {
  const start = position++;
  while (position < text.length) {
    if (text[position] === '\\') position += 2;
    else if (text[position++] === '"') break;
  }
  return JSON.parse(text.slice(start, position));
}
function value(path) {
  whitespace();
  const start = position;
  if (text[position] === '{') {
    position++;
    whitespace();
    while (text[position] !== '}') {
      const key = string();
      whitespace();
      position++; // colon; JSON.parse already validated the document
      value([...path, key]);
      whitespace();
      if (text[position] !== ',') break;
      position++;
      whitespace();
    }
    position++;
  } else if (text[position] === '[') {
    position++;
    whitespace();
    let index = 0;
    while (text[position] !== ']') {
      value([...path, index++]);
      whitespace();
      if (text[position] !== ',') break;
      position++;
    }
    position++;
  } else if (text[position] === '"') string();
  else while (position < text.length && !/[\s,}\]]/.test(text[position])) position++;
  const key = JSON.stringify(path);
  if (updates.has(key)) {
    edits.push({ start, end: position, replacement: JSON.stringify(updates.get(key)) });
    updates.delete(key);
  }
}
value([]);
if (updates.size) throw new Error(`Missing manifest fields: ${[...updates.keys()].join(', ')}`);
let result = text;
for (const { start, end, replacement } of edits.sort((a, b) => b.start - a.start)) {
  result = result.slice(0, start) + replacement + result.slice(end);
}
JSON.parse(result);
if (bom + result !== original) fs.writeFileSync(file, bom + result, 'utf8');
