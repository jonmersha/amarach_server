import fs from 'fs';

const schemaContent = fs.readFileSync('schema.sql', 'utf8');
const lines = schemaContent.split('\n');

const tableColumns = {};

for (let line of lines) {
    if (line.startsWith('INSERT ')) {
        const match = line.match(/INTO `([^`]+)` \(([^)]+)\)/);
        if (match) {
            const tableName = match[1];
            const columnsStr = match[2];
            const columns = columnsStr.split(',').map(c => c.trim().replace(/`/g, ''));
            
            if (!tableColumns[tableName]) {
                tableColumns[tableName] = new Set();
            }
            for (let c of columns) {
                tableColumns[tableName].add(c);
            }
        }
    }
}

let newLines = [];
let i = 0;
while (i < lines.length) {
    let line = lines[i];
    if (line.startsWith('CREATE TABLE IF NOT EXISTS')) {
        const match = line.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/);
        newLines.push(line);
        i++;
        if (match) {
            const tableName = match[1];
            const existingCols = new Set();
            
            const blockLines = [];
            while (i < lines.length) {
                let bline = lines[i];
                if (bline.trim().startsWith(');')) {
                    break;
                }
                blockLines.push(bline);
                
                const colMatch = bline.match(/^\s*`([^`]+)`/);
                if (colMatch) {
                    existingCols.add(colMatch[1]);
                }
                i++;
            }
            
            const missingCols = [];
            if (tableColumns[tableName]) {
                for (let col of tableColumns[tableName]) {
                    if (!existingCols.has(col)) {
                        missingCols.push(col);
                    }
                }
            }
            
            let primaryKeyLineIdx = blockLines.findIndex(l => l.trim().startsWith('PRIMARY KEY'));
            
            if (missingCols.length > 0) {
                const newColLines = missingCols.map(c => `  \`${c}\` LONGTEXT`);
                
                if (primaryKeyLineIdx !== -1) {
                    let prevLineIdx = primaryKeyLineIdx - 1;
                    if (prevLineIdx >= 0 && !blockLines[prevLineIdx].trim().endsWith(',')) {
                        blockLines[prevLineIdx] += ',';
                    }
                    
                    const formattedNewColLines = newColLines.map(l => l + ',');
                    blockLines.splice(primaryKeyLineIdx, 0, ...formattedNewColLines);
                } else {
                    if (blockLines.length > 0 && !blockLines[blockLines.length - 1].trim().endsWith(',')) {
                        blockLines[blockLines.length - 1] += ',';
                    }
                    const formattedNewColLines = newColLines.map((l, idx) => l + (idx === newColLines.length - 1 ? '' : ','));
                    blockLines.push(...formattedNewColLines);
                }
            }
            
            newLines.push(...blockLines);
            newLines.push(');');
        }
    } else {
        newLines.push(line);
        i++;
    }
}

fs.writeFileSync('schema.sql', newLines.join('\n'));
console.log('Schema adjusted.');
