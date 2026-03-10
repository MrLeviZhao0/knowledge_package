// 转换知识树为图形数据
function convertToGraphData(node, maxLevel = 2, parentId = null, currentLevel = 0, expandedNodes = new Set()) {
    const nodes = [];
    const links = [];
    
    // 判断节点是否应该显示
    const shouldShow = (currentLevel <= 1 && node.type === 'folder') || 
                       (currentLevel === 2 && (node.type === 'folder' || (node.type === 'file' && expandedNodes.has(parentId)))) || 
                       (currentLevel >= 3 && expandedNodes.has(parentId));
    
    // 只添加符合条件的节点
    if (shouldShow) {
        nodes.push({
            id: node.path || node.name,
            name: node.name,
            type: node.type,
            level: node.level,
            parent: parentId,
            children: node.children ? node.children.length : 0,
            path: node.path || node.name
        });
        
        if (parentId) {
            links.push({
                source: parentId,
                target: node.path || node.name
            });
        }
    }
    
    // 递归处理子节点
    if (node.children) {
        node.children.forEach(child => {
            // 对于 level 1+ 的节点，只有在父节点被展开时才显示子节点
            const shouldProcessChildren = (currentLevel < 1) || 
                                         (currentLevel >= 1 && expandedNodes.has(node.path || node.name));
            
            if (shouldProcessChildren) {
                const childData = convertToGraphData(child, maxLevel, node.path || node.name, currentLevel + 1, expandedNodes);
                nodes.push(...childData.nodes);
                links.push(...childData.links);
            }
        });
    }
    
    return { nodes, links };
}

// 初始化图形
function initGraph() {
    console.log('=== 初始化图形 ===');
    
    // 获取图形数据 - 初始只显示 level 0/1/2 的 folder 节点
    const expandedNodes = new Set();
    const graphData = convertToGraphData(knowledgeBase, 2, null, 0, expandedNodes);
    
    console.log('初始图形数据:', {
        nodesCount: graphData.nodes.length,
        linksCount: graphData.links.length,
        nodes: graphData.nodes.map(n => ({ name: n.name, level: n.level, type: n.type }))
    });

    // 颜色映射
    const colorMap = {
        0: '#ff7f0e',      // 橙色 - 根节点
        1: '#ff7f0e',      // 橙色 - 一级目录
        2: '#2ca02c',      // 绿色 - 二级目录
        3: '#1f77b4',      // 蓝色 - 三级目录
        4: '#d62728',      // 深绿色 - 四级目录(文件)
        file: '#9467bd'     // 紫色 - 文件节点
    };

    // 创建Babylon.js引擎
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);
    
    // 创建场景
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.95, 0.95, 0.95, 1);
    
    // 创建相机
    const camera = new BABYLON.ArcRotateCamera('camera', 0, Math.PI / 3, 100, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 200;
    
    // 创建光源
    const light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
    light1.intensity = 0.7;
    
    const light2 = new BABYLON.DirectionalLight('light2', new BABYLON.Vector3(-1, -2, -1), scene);
    light2.position = new BABYLON.Vector3(20, 40, 20);
    light2.intensity = 0.3;
    
    // 存储节点和连线的引用
    const nodeMeshes = [];
    const linkLines = [];
    const labelMeshes = [];
    
    // 神经生长锥类
    class GrowthCone {
        constructor(position, direction, level) {
            this.position = position.clone();
            this.direction = direction.clone().normalize();
            this.level = level;
            this.filopodia = [];
            this.stepSize = 5 + level * 2;
            this.branchAngle = Math.PI / 4; // 45度
        }
        
        // 向前延伸
        elongate() {
            const newPos = this.position.add(this.direction.scale(this.stepSize));
            this.position = newPos;
            return newPos;
        }
        
        // 分支
        branch() {
            const numBranches = 2 + Math.floor(Math.random() * 2);
            const branches = [];
            
            for (let i = 0; i < numBranches; i++) {
                const angle = (i / numBranches) * Math.PI * 2;
                const newDirection = this.rotateDirection(this.direction, this.branchAngle, angle);
                branches.push(new GrowthCone(this.position.clone(), newDirection, this.level + 1));
            }
            
            return branches;
        }
        
        // 转向（添加随机噪声）
        turn() {
            const noiseAmount = 0.2;
            const noise = new BABYLON.Vector3(
                (Math.random() - 0.5) * noiseAmount,
                (Math.random() - 0.5) * noiseAmount,
                (Math.random() - 0.5) * noiseAmount
            );
            this.direction = this.direction.add(noise).normalize();
        }
        
        // 旋转方向向量
        rotateDirection(direction, angle, rotationAngle) {
            const axis = new BABYLON.Vector3(
                Math.sin(rotationAngle),
                Math.cos(rotationAngle),
                0
            ).normalize();
            
            const quaternion = BABYLON.Quaternion.RotationAxis(axis, angle);
            const newDirection = direction.clone();
            newDirection.applyQuaternionInPlace(quaternion);
            return newDirection.normalize();
        }
        
        // 生成前端细丝
        generateFilopodia() {
            const numFilaments = 3 + Math.floor(Math.random() * 3);
            this.filopodia = [];
            
            for (let i = 0; i < numFilaments; i++) {
                const angle = (i / numFilaments) * Math.PI * 2;
                const filoDir = this.rotateDirection(this.direction, Math.PI / 6, angle);
                this.filopodia.push({
                    position: this.position.clone(),
                    direction: filoDir
                });
            }
        }
    }
    
    // 基于神经生长锥的节点布局算法
    function calculateNeuronLayout(graphData) {
        const positions = {};
        const rootPos = new BABYLON.Vector3(0, 0, 0);
        positions[graphData.nodes[0].id] = rootPos;
        
        // 一级节点：只有4个（业务模块知识、基础与面试、语言技巧知识、项目经验）
        const level1Nodes = graphData.nodes.filter(n => n.level === 1 && n.parent === graphData.nodes[0].id);
        const level1Directions = [
            new BABYLON.Vector3(1, 0, 1).normalize(),
            new BABYLON.Vector3(-1, 0, 1).normalize(),
            new BABYLON.Vector3(1, 0, -1).normalize(),
            new BABYLON.Vector3(-1, 0, -1).normalize()
        ];
        
        level1Nodes.forEach((node, index) => {
            const direction = level1Directions[index % level1Directions.length];
            const cone = new GrowthCone(rootPos.clone(), direction, 1);
            const pos = cone.elongate();
            positions[node.id] = pos;
        });
                // 二级及以上节点：在父节点周围分布，满足角度约束
        graphData.nodes.filter(n => n.level >= 2).forEach(node => {
            const parentNode = graphData.nodes.find(n => n.id === node.parent);
            if (!parentNode) return;
            
            const parentPos = positions[parentNode.id];
            
            // 获取同级节点
            const siblings = graphData.nodes.filter(n => n.level === node.level && n.parent === node.parent);
            const siblingIndex = siblings.findIndex(n => n.id === node.id);
            
            // 计算从父节点到当前节点的父节点的方向（即父节点的父节点到父节点的向量）
            let parentToCurrentDirection;
            if (parentNode.parent) {
                const grandparentPos = positions[parentNode.parent];
                parentToCurrentDirection = parentPos.subtract(grandparentPos).normalize();
            } else {
                // 对于二级节点，父节点是根节点，使用父节点到根节点的反方向
                parentToCurrentDirection = parentPos.subtract(rootPos).normalize();
            }
            
            // 根据层级调整半径
            const radius = 8 + node.level * 2;
            
            // 计算子节点的方向，确保与父节点到当前节点的方向夹角在45度以内
            const numSiblings = siblings.length;
            const maxAngle = Math.PI / 4; // 45度
            
            // 计算子节点在圆上的角度
            const angle = (siblingIndex / numSiblings) * Math.PI * 2;
            
            // 使用球坐标系计算方向向量
            // 确保与父方向的夹角在45度以内
            const theta = angle; // 方位角
            const phi = maxAngle; // 极角（与父方向的夹角）
            
            // 创建垂直于父方向的两个正交向量
            let perpendicular1, perpendicular2;
            
            // 计算第一个垂直向量
            if (Math.abs(parentToCurrentDirection.y) < 0.9) {
                // 如果父方向不是几乎垂直的，使用y轴作为参考
                perpendicular1 = new BABYLON.Vector3(
                    -parentToCurrentDirection.z,
                    0,
                    parentToCurrentDirection.x
                );
            } else {
                // 如果父方向几乎垂直，使用x轴作为参考
                perpendicular1 = new BABYLON.Vector3(
                    1,
                    0,
                    0
                );
            }
            
            // 确保垂直向量不为零
            if (perpendicular1.length() === 0) {
                perpendicular1 = new BABYLON.Vector3(1, 0, 0);
            }
            
            perpendicular1 = perpendicular1.normalize();
            
            // 计算第二个垂直向量（与第一个正交）
            perpendicular2 = parentToCurrentDirection.cross(perpendicular1).normalize();
            
            // 计算球坐标系中的方向向量
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            // 计算方向向量：在父方向周围的球面上均匀分布
            direction = parentToCurrentDirection.scale(cosPhi)
                .add(perpendicular1.scale(sinPhi * cosTheta))
                .add(perpendicular2.scale(sinPhi * sinTheta))
                .normalize();
            
            // 计算新位置
            const pos = parentPos.add(direction.scale(radius));
            positions[node.id] = pos;
        });
        
        return positions;
    }
    
    // 计算节点位置（使用神经生长锥算法）
    const nodePositions = calculateNeuronLayout(graphData);
    
    // 获取节点位置的辅助函数
    function getNodePosition(graphData, nodeId) {
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (!node) return {x: 0, y: 0, z: 0};
        
        const pos = nodePositions[nodeId];
        if (pos) {
            return {x: pos.x, y: pos.y, z: pos.z};
        }
        
        return {x: 0, y: -10 * (node.level || 1), z: 0};
    }
    
    // 创建节点和标签
    graphData.nodes.forEach((node, index) => {
        const pos = getNodePosition(graphData, node.id);
        const x = pos.x;
        const y = pos.y;
        const z = pos.z;
        
        // 根据子节点数量调整节点大小
        const childCount = node.children || 0;
        const size = node.type === 'file' ? 1.5 : Math.max(0.8, Math.min(2.0, 0.8 + childCount * 0.15));
        
        let nodeMesh;
        if (node.type === 'file') {
            // 创建三角形节点（文件）
            nodeMesh = BABYLON.MeshBuilder.CreateCylinder(`node-${node.id}`, {
                height: 2.0, // 增加高度使其更明显
                diameterTop: 0,
                diameterBottom: size * 2,
                tessellation: 3
            }, scene);
        } else {
            // 创建球形节点（目录）
            nodeMesh = BABYLON.MeshBuilder.CreateSphere(`node-${node.id}`, {
                diameter: size * 2,
                segments: 16
            }, scene);
        }
        
        nodeMesh.position = new BABYLON.Vector3(x, y, z);
        
        // 创建材质
        const material = new BABYLON.StandardMaterial(`mat-${node.id}`, scene);
        
        // 判断节点是否可点击
        // level 2+ 的节点可以点击，level 0/1 的节点只有在下面直接是 file 时才可点击
        const isClickable = (node.level >= 2) || 
                           (node.level <= 1 && hasDirectFilesInKnowledgeBase(node));
        
        console.log(`节点 ${node.name} (level ${node.level}):`, {
            isClickable: isClickable,
            type: node.type,
            children: node.children
        });
        
        // 使用RGB值直接创建颜色，而不是FromHexString
        let babylonColor;
        if (node.type === 'file') {
            // 紫色文件节点: #9467bd -> RGB(148, 103, 189) -> RGB(0.58, 0.40, 0.74)
            babylonColor = new BABYLON.Color3(0.58, 0.40, 0.74);
        } else {
            // 根据级别设置目录颜色
            switch(node.level) {
                case 0:
                case 1:
                    // 橙色: #ff7f0e -> RGB(255, 127, 14) -> RGB(1.0, 0.50, 0.05)
                    babylonColor = new BABYLON.Color3(1.0, 0.50, 0.05);
                    break;
                case 2:
                    // 绿色: #2ca02c -> RGB(44, 160, 44) -> RGB(0.17, 0.63, 0.17)
                    babylonColor = new BABYLON.Color3(0.17, 0.63, 0.17);
                    break;
                case 3:
                    // 蓝色: #1f77b4 -> RGB(31, 119, 180) -> RGB(0.12, 0.47, 0.71)
                    babylonColor = new BABYLON.Color3(0.12, 0.47, 0.71);
                    break;
                default:
                    // 默认灰色
                    babylonColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            }
        }
        
        material.diffuseColor = babylonColor;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        // 可点击节点有更高的自发光，使其更明显
        if (isClickable) {
            material.emissiveColor = babylonColor.scale(0.4);
            material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        } else {
            material.emissiveColor = babylonColor.scale(0.2);
        }
        
        nodeMesh.material = material;
        
        // 存储节点数据
        nodeMesh.metadata = node;
        
        // 创建标签
        const labelTexture = new BABYLON.DynamicTexture(`label-${node.id}`, {width: 256, height: 64}, scene);
        labelTexture.hasAlpha = true;
        
        const labelContext = labelTexture.getContext();
        labelContext.fillStyle = 'rgba(255,255,255, 0.8)';
        labelContext.fillRect(0, 0, 256, 64);
        labelContext.font = '20px Arial';
        labelContext.fillStyle = 'black';
        labelContext.textAlign = 'center';
        labelContext.fillText(node.name, 128, 40);
        
        labelTexture.update();
        
        const labelMaterial = new BABYLON.StandardMaterial(`labelMat-${node.id}`, scene);
        labelMaterial.diffuseTexture = labelTexture;
        labelMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        labelMaterial.backFaceCulling = false;
        
        const labelPlane = BABYLON.MeshBuilder.CreatePlane(`label-${node.id}`, {width: 10, height: 2.5}, scene);
        labelPlane.position = new BABYLON.Vector3(x, y + size + 2, z);
        labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        labelPlane.material = labelMaterial;
        
        // 存储引用
        nodeMeshes.push(nodeMesh);
        labelMeshes.push(labelPlane);
    });
    
    // 创建连线
    graphData.links.forEach(link => {
        const sourceNode = graphData.nodes.find(n => n.id === link.source);
        const targetNode = graphData.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
            const sourceMesh = nodeMeshes.find(m => m.metadata && m.metadata.id === link.source);
            const targetMesh = nodeMeshes.find(m => m.metadata && m.metadata.id === link.target);
            
            if (sourceMesh && targetMesh) {
                const line = BABYLON.MeshBuilder.CreateLines(`line-${link.source}-${link.target}`, {
                    points: [
                        sourceMesh.position,
                        targetMesh.position
                    ]
                }, scene);
                
                const lineMaterial = new BABYLON.StandardMaterial(`lineMat-${link.source}-${link.target}`, scene);
                lineMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
                lineMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                line.material = lineMaterial;
                
                linkLines.push(line);
            }
        }
    });
    
    // 处理节点点击事件
    scene.onPointerObservable.add((pointerInfo) => {
        // 只处理点击事件且命中物体时的日志
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.pickInfo.hit) {
            console.log('=== 点击事件触发 ===');
            console.log('事件类型:', pointerInfo.type);
            console.log('是否命中:', pointerInfo.pickInfo.hit);
            
            const pickedMesh = pointerInfo.pickInfo.pickedMesh;
            console.log('点击的网格:', pickedMesh);
            console.log('网格元数据:', pickedMesh.metadata);
            
            if (pickedMesh && pickedMesh.metadata) {
                const node = pickedMesh.metadata;
                console.log('节点信息:', {
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    level: node.level,
                    children: node.children,
                    path: node.path
                });
                
                if (node.type === 'file') {
                    console.log('这是文件节点，准备跳转到:', node.path);
                    // 文件节点，跳转到对应文档
                    const githubPath = node.path.replace(/^\//, '');
                    const githubUrl = `https://rawcdn.githack.com/MrLeviZhao0/knowledge_package/80e2c7823ca76f86b9a9906c17a09388aec677f3/${githubPath}`;
                    console.log('GitHub URL:', githubUrl);
                    window.open(githubUrl, '_blank');
                } else {
                    // 目录节点
                    // level 2+ 的节点可以点击，level 0/1 的节点只有在下面直接是 file 时才可点击
                    const canClick = (node.level >= 2) || 
                                    (node.level <= 1 && hasDirectFilesInKnowledgeBase(node));
                    
                    console.log('目录节点点击判断:', {
                        level: node.level,
                        canClick: canClick,
                        hasDirectFiles: node.level <= 1 ? hasDirectFilesInKnowledgeBase(node) : 'N/A'
                    });
                    
                    if (canClick) {
                        console.log('节点可点击，准备展开/折叠');
                        toggleNodeExpansion(node);
                    } else {
                        console.log('节点不可点击');
                    }
                }
                
                // 显示节点信息
                const nodeInfo = document.getElementById('node-info');
                document.getElementById('node-title').textContent = node.name;
                document.getElementById('node-desc').textContent = 
                    node.type === 'file' ? 
                    `文档文件: ${node.path}` : 
                    `目录节点: ${node.children} 个子项`;
                nodeInfo.style.display = 'block';
            } else {
                console.log('点击的网格没有元数据');
            }
        }
    });
    
    // 检查目录下是否有直接文件
    function hasDirectFiles(node) {
        if (!node.children) return false;
        return node.children.some(child => child.type === 'file');
    }
    
    // 在知识库中检查目录下是否有直接文件
    function hasDirectFilesInKnowledgeBase(node) {
        function findNode(nodeData, path) {
            if (nodeData.path === path) {
                return nodeData;
            }
            
            if (nodeData.children) {
                for (const child of nodeData.children) {
                    const result = findNode(child, path);
                    if (result) return result;
                }
            }
            
            return null;
        }
        
        const nodeInKnowledgeBase = findNode(knowledgeBase, node.path);
        return nodeInKnowledgeBase ? hasDirectFiles(nodeInKnowledgeBase) : false;
    }
    
    // 切换节点展开/折叠状态
    function toggleNodeExpansion(node) {
        console.log('=== 切换节点展开状态 ===');
        console.log('节点:', node.name, node.path);
        
        try {
            // 在知识库结构中找到对应的节点并更新其展开状态
            function findAndUpdateNode(nodeData, path) {
                if (nodeData.path === path) {
                    nodeData.__expanded = !nodeData.__expanded;
                    return nodeData;
                }
                
                if (nodeData.children) {
                    for (const child of nodeData.children) {
                        const result = findAndUpdateNode(child, path);
                        if (result) return result;
                    }
                }
                
                return null;
            }
            
            // 找到节点并更新展开状态
            const targetNode = findAndUpdateNode(knowledgeBase, node.path);
            console.log('找到的目标节点:', targetNode);
            
            if (targetNode) {
                console.log('展开状态:', targetNode.__expanded);
                
                // 如果是 level 2+ 的节点，展开时需要展开所有子节点
                if (node.level >= 2 && targetNode.__expanded) {
                    console.log('展开所有子节点');
                    function expandAllChildren(nodeData) {
                        if (nodeData.children) {
                            nodeData.children.forEach(child => {
                                child.__expanded = true;
                                expandAllChildren(child);
                            });
                        }
                    }
                    expandAllChildren(targetNode);
                }
                
                // 收集所有展开的节点路径
                const expandedNodes = new Set();
                function collectExpandedNodes(nodeData) {
                    if (nodeData.__expanded) {
                        expandedNodes.add(nodeData.path || nodeData.name);
                    }
                    if (nodeData.children) {
                        nodeData.children.forEach(child => collectExpandedNodes(child));
                    }
                }
                collectExpandedNodes(knowledgeBase);
                
                console.log('展开的节点数量:', expandedNodes.size);
                console.log('展开的节点:', Array.from(expandedNodes));
                
                // 重新生成图形数据
                const newGraphData = convertToGraphData(knowledgeBase, 2, null, 0, expandedNodes);
                console.log('新的图形数据:', {
                    nodesCount: newGraphData.nodes.length,
                    linksCount: newGraphData.links.length
                });
                
                // 更新图形
                updateGraph(newGraphData);
            }
        } catch (error) {
            console.error('切换节点展开状态时出错:', error);
        }
    }
    
    // 更新图形
    function updateGraph(newGraphData) {
        // 保存当前节点的位置
        const currentPositions = new Map();
        nodeMeshes.forEach(mesh => {
            if (mesh.metadata) {
                currentPositions.set(mesh.metadata.id, mesh.position.clone());
            }
        });
        
        // 清除现有的节点和连线
        nodeMeshes.forEach(mesh => mesh.dispose());
        linkLines.forEach(line => line.dispose());
        labelMeshes.forEach(label => label.dispose());
        
        nodeMeshes.length = 0;
        linkLines.length = 0;
        labelMeshes.length = 0;
        
        // 重新计算节点位置（使用神经生长锥算法）
        const newNodePositions = calculateNeuronLayout(newGraphData);
        
        // 重新创建节点和连线
        newGraphData.nodes.forEach((node, index) => {
            const pos = newNodePositions[node.id];
            const x = pos.x;
            const y = pos.y;
            const z = pos.z;
            
            // 根据子节点数量调整节点大小
            const childCount = node.children || 0;
            const size = node.type === 'file' ? 1.5 : Math.max(0.8, Math.min(2.0, 0.8 + childCount * 0.15));
            
            let nodeMesh;
            if (node.type === 'file') {
                // 创建三角形节点（文件）
                nodeMesh = BABYLON.MeshBuilder.CreateCylinder(`node-${node.id}`, {
                    height: 1.0, // 增加高度使其更明显
                    diameterTop: 0,
                    diameterBottom: size * 2,
                    tessellation: 3
                }, scene);
            } else {
                // 创建球形节点（目录）
                nodeMesh = BABYLON.MeshBuilder.CreateSphere(`node-${node.id}`, {
                    diameter: size * 2,
                    segments: 16
                }, scene);
            }
            
            // 使用保存的位置或计算新位置
            let position;
            if (currentPositions.has(node.id)) {
                // 使用保存的位置，确保节点不移动
                position = currentPositions.get(node.id);
            } else {
                // 新节点，计算位置
                position = new BABYLON.Vector3(x, y, z);
            }
            
            nodeMesh.position = position;
            
            // 创建材质
            const material = new BABYLON.StandardMaterial(`mat-${node.id}`, scene);
            
            // 判断节点是否可点击
            // level 2+ 的节点可以点击，level 0/1 的节点只有在下面直接是 file 时才可点击
            const isClickable = (node.level >= 2) || 
                               (node.level <= 1 && hasDirectFilesInKnowledgeBase(node));
            
            // 使用RGB值直接创建颜色，而不是FromHexString
            let babylonColor;
            if (node.type === 'file') {
                // 紫色文件节点: #9467bd -> RGB(148, 103, 189) -> RGB(0.58, 0.40, 0.74)
                babylonColor = new BABYLON.Color3(0.58, 0.40, 0.74);
            } else {
                // 根据级别设置目录颜色
                switch(node.level) {
                    case 0:
                    case 1:
                        // 橙色: #ff7f0e -> RGB(255, 127, 14) -> RGB(1.0, 0.50, 0.05)
                        babylonColor = new BABYLON.Color3(1.0, 0.50, 0.05);
                        break;
                    case 2:
                        // 绿色: #2ca02c -> RGB(44, 160, 44) -> RGB(0.17, 0.63, 0.17)
                        babylonColor = new BABYLON.Color3(0.17, 0.63, 0.17);
                        break;
                    case 3:
                        // 蓝色: #1f77b4 -> RGB(31, 119, 180) -> RGB(0.12, 0.47, 0.71)
                        babylonColor = new BABYLON.Color3(0.12, 0.47, 0.71);
                        break;
                    default:
                        // 默认灰色
                        babylonColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                }
            }
            
            material.diffuseColor = babylonColor;
            material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            // 可点击节点有更高的自发光，使其更明显
            if (isClickable) {
                material.emissiveColor = babylonColor.scale(0.4);
                material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            } else {
                material.emissiveColor = babylonColor.scale(0.2);
            }
            
            nodeMesh.material = material;
            
            // 存储节点数据
            nodeMesh.metadata = node;
            
            // 创建标签
            const labelTexture = new BABYLON.DynamicTexture(`label-${node.id}`, {width: 256, height: 64}, scene);
            labelTexture.hasAlpha = true;
            
            const labelContext = labelTexture.getContext();
            labelContext.fillStyle = 'rgba(255, 255, 255, 0.8)';
            labelContext.fillRect(0, 0, 256, 64);
            labelContext.font = '20px Arial';
            labelContext.fillStyle = 'black';
            labelContext.textAlign = 'center';
            labelContext.fillText(node.name, 128, 40);
            
            labelTexture.update();
            
            const labelMaterial = new BABYLON.StandardMaterial(`labelMat-${node.id}`, scene);
            labelMaterial.diffuseTexture = labelTexture;
            labelMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
            labelMaterial.backFaceCulling = false;
            
            const labelPlane = BABYLON.MeshBuilder.CreatePlane(`label-${node.id}`, {width: 10, height: 2.5}, scene);
            // 使用与节点相同的位置逻辑，确保标签跟随节点
            const labelPosition = position.clone();
            labelPosition.y += size + 2;
            labelPlane.position = labelPosition;
            labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            labelPlane.material = labelMaterial;
            
            // 存储引用
            nodeMeshes.push(nodeMesh);
            labelMeshes.push(labelPlane);
        });
        
        // 创建连线
        newGraphData.links.forEach(link => {
            const sourceNode = newGraphData.nodes.find(n => n.id === link.source);
            const targetNode = newGraphData.nodes.find(n => n.id === link.target);
            
            if (sourceNode && targetNode) {
                const sourceMesh = nodeMeshes.find(m => m.metadata && m.metadata.id === link.source);
                const targetMesh = nodeMeshes.find(m => m.metadata && m.metadata.id === link.target);
                
                if (sourceMesh && targetMesh) {
                    const line = BABYLON.MeshBuilder.CreateLines(`line-${link.source}-${link.target}`, {
                        points: [
                            sourceMesh.position,
                            targetMesh.position
                        ]
                    }, scene);
                    
                    const lineMaterial = new BABYLON.StandardMaterial(`lineMat-${link.source}-${link.target}`, scene);
                    lineMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
                    lineMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                    line.material = lineMaterial;
                    
                    linkLines.push(line);
                }
            }
        });
    }
    
    // 控制按钮功能
    document.getElementById('reset-view').addEventListener('click', () => {
        camera.alpha = 0;
        camera.beta = Math.PI / 3;
        camera.radius = 100;
        
        // 重置到初始状态：只显示 level 0/1/2 的 folder 节点
        try {
            function setAllExpanded(nodeData, expanded) {
                nodeData.__expanded = expanded;
                
                if (nodeData.children) {
                    nodeData.children.forEach(child => setAllExpanded(child, expanded));
                }
            }
            
            setAllExpanded(knowledgeBase, false);
            
            const expandedNodes = new Set();
            const newGraphData = convertToGraphData(knowledgeBase, 2, null, 0, expandedNodes);
            updateGraph(newGraphData);
        } catch (error) {
            console.error('重置视图时出错:', error);
        }
    });

    let linksVisible = true;
    document.getElementById('toggle-links').addEventListener('click', () => {
        linksVisible = !linksVisible;
        linkLines.forEach(line => {
            line.setEnabled(linksVisible);
        });
    });

    let labelsVisible = true;
    document.getElementById('toggle-labels').addEventListener('click', () => {
        labelsVisible = !labelsVisible;
        labelMeshes.forEach(label => {
            label.setEnabled(labelsVisible);
        });
    });

    // 展开所有节点
    document.getElementById('expand-all').addEventListener('click', () => {
        try {
            function setAllExpanded(nodeData, expanded) {
                nodeData.__expanded = expanded;
                
                if (nodeData.children) {
                    nodeData.children.forEach(child => setAllExpanded(child, expanded));
                }
            }
            
            setAllExpanded(knowledgeBase, true);
            
            // 收集所有展开的节点路径
            const expandedNodes = new Set();
            function collectExpandedNodes(nodeData) {
                if (nodeData.__expanded) {
                    expandedNodes.add(nodeData.path || nodeData.name);
                }
                if (nodeData.children) {
                    nodeData.children.forEach(child => collectExpandedNodes(child));
                }
            }
            collectExpandedNodes(knowledgeBase);
            
            const newGraphData = convertToGraphData(knowledgeBase, 2, null, 0, expandedNodes);
            updateGraph(newGraphData);
        } catch (error) {
            console.error('展开所有节点时出错:', error);
        }
    });

    // 折叠所有节点
    document.getElementById('collapse-all').addEventListener('click', () => {
        try {
            function setAllExpanded(nodeData, expanded) {
                nodeData.__expanded = expanded;
                
                if (nodeData.children) {
                    nodeData.children.forEach(child => setAllExpanded(child, expanded));
                }
            }
            
            setAllExpanded(knowledgeBase, false);
            
            const expandedNodes = new Set();
            const newGraphData = convertToGraphData(knowledgeBase, 2, null, 0, expandedNodes);
            updateGraph(newGraphData);
        } catch (error) {
            console.error('折叠所有节点时出错:', error);
        }
    });
    
    // 运行渲染循环
    engine.runRenderLoop(() => {
        scene.render();
    });
    
    // 处理窗口大小变化
    window.addEventListener('resize', () => {
        engine.resize();
    });
    
    // 隐藏加载消息
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// 页面加载完成后初始化图形
document.addEventListener('DOMContentLoaded', function() {
    if (typeof BABYLON === 'undefined') {
        console.error('Babylon.js库未加载');
        document.getElementById('loading-overlay').innerHTML = '<div style="padding: 20px; color: red;">Babylon.js库未加载，请检查网络连接</div>';
        return;
    }
    
    try {
        initGraph();
    } catch (error) {
        console.error('初始化3D图形时出错:', error);
        document.getElementById('loading-overlay').innerHTML = `<div style="padding: 20px; color: red;">初始化3D图形时出错: ${error.message}</div>`;
    }
});