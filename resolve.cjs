const fs = require('fs');
const { SourceMapConsumer } = require('./node_modules/source-map-js');

const mapPath = './dist/assets/index-h_B6Kztg.js.map';
const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const positions = [
  { name: 'b2', line: 161, column: 54188 },
  { name: 'Hc', line: 8, column: 48085 },
  { name: 'lu', line: 8, column: 70881 },
  { name: 'Nm', line: 8, column: 116957 },
  { name: 'uv', line: 8, column: 116003 },
  { name: 'ku', line: 8, column: 115835 },
];

const consumer = new SourceMapConsumer(raw);
for (const p of positions) {
  const res = consumer.originalPositionFor({ line: p.line, column: p.column });
  console.log(p.name, p.line + ':' + p.column, '->', JSON.stringify(res));
}
