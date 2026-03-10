const fs = require('fs');
const path = require('path');

function buildKnowledgeTree(dirPath, level = 1, parentPath = '') {
    const items = [];
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        const relativePath = parentPath ? `${parentPath}/${file}` : file;
        
        if (stat.isDirectory()) {
            const children = buildKnowledgeTree(filePath, level + 1, relativePath);
            if (children.length > 0) {
                items.push({
                    name: file,
                    path: relativePath,
                    type: 'folder',
                    level: level,
                    children: children
                });
            }
        } else if (file.endsWith('.md')) {
            const nameWithoutExt = file.replace('.md', '');
            items.push({
                name: nameWithoutExt,
                path: relativePath,
                type: 'file',
                level: level
            });
        }
    });
    
    return items;
}

const knowledgeBase = {
    name: "知识库",
    path: "",
    type: "folder",
    level: 0,
    children: [
        {
            name: "业务模块知识",
            path: "业务模块知识",
            type: "folder",
            level: 1,
            children: buildKnowledgeTree('业务模块知识', 2)
        },
        {
            name: "基础与面试",
            path: "基础与面试",
            type: "folder",
            level: 1,
            children: buildKnowledgeTree('基础与面试', 2)
        },
        {
            name: "语言技巧知识",
            path: "语言技巧知识",
            type: "folder",
            level: 1,
            children: buildKnowledgeTree('语言技巧知识', 2)
        },
        {
            name: "项目经验",
            path: "项目经验",
            type: "folder",
            level: 1,
            children: buildKnowledgeTree('项目经验', 2)
        }
    ]
};

console.log(JSON.stringify(knowledgeBase, null, 2));