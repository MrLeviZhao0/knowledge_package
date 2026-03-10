const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');
const kbData = fs.readFileSync('complete_kb_data.json', 'utf8');

const startMarker = 'const knowledgeBase = {';
const endMarker = '};';

const startIndex = indexHtml.indexOf(startMarker);
const endIndex = indexHtml.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const beforeKb = indexHtml.substring(0, startIndex);
    const afterKb = indexHtml.substring(endIndex + endMarker.length);
    
    const kbDataOnly = kbData.substring(kbData.indexOf('{'));
    
    const newIndexHtml = beforeKb + startMarker + kbDataOnly + afterKb;
    
    fs.writeFileSync('index.html', newIndexHtml, 'utf8');
    
    console.log('知识库数据结构已更新');
} else {
    console.error('未找到知识库数据结构的位置');
}