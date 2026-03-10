#!/bin/bash

# 脚本功能：更新最新知识库目录结构到可视化的数据源
# 排除规则：不包含xxxSkill文档模板.md这类文件

echo "开始更新知识库目录结构..."

# 创建临时JavaScript文件来生成数据
cat > update_kb_temp.js << 'EOF'
const fs = require('fs');
const path = require('path');

function buildKnowledgeTree(dirPath, level = 1, parentPath = '') {
    const items = [];
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        // 排除xxxSkill文档模板.md这类文件
        if (file.includes('Skill文档模板.md')) {
            return;
        }
        
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
            children: buildKnowledgeTree('业务模块知识', 2, '业务模块知识')
        },
        {
            name: "基础与面试",
            path: "基础与面试",
            type: "folder",
            level: 1,
            children: buildKnowledgeTree('基础与面试', 2, '基础与面试')
        },
        {
            name: "语言技巧知识",
            path: "语言技巧知识",
            type: "folder",
            level: 1,
            children: buildKnowledgeTree('语言技巧知识', 2, '语言技巧知识')
        },
        {
            name: "项目经验",
            path: "项目经验",
            type: "folder",
            level: 1,
            children: buildKnowledgeTree('项目经验', 2, '项目经验')
        }
    ]
};

// 写入kb_data.js文件
const content = `const knowledgeBase = ${JSON.stringify(knowledgeBase, null, 2)};`;
fs.writeFileSync('kb_data.js', content);
console.log('知识库目录结构已更新到kb_data.js');
EOF

# 运行临时JavaScript文件
node update_kb_temp.js

# 删除临时文件
rm update_kb_temp.js

echo "知识库目录结构更新完成！"
echo "已排除xxxSkill文档模板.md这类文件"
echo "数据已更新到kb_data.js"