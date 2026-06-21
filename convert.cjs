const fs = require('fs');
const lines = fs.readFileSync('schema.sql', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.startsWith('INSERT ')) {
    const splitIndex = line.indexOf(' VALUES ');
    if (splitIndex !== -1) {
      let p1 = line.substring(0, splitIndex).replace(/"/g, '`');
      let p2 = line.substring(splitIndex);
      lines[i] = p1 + p2;
    }
  } else {
    lines[i] = line.replace(/"/g, '`');
  }
}

fs.writeFileSync('schema.sql', lines.join('\n'));
console.log('Conversion complete.');
