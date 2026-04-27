const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

function findDialog(text) {
    for (const dialog of config.dialogs) {
        for (const keyword of dialog.keywords) {
            if (text.includes(keyword)) {
                return dialog;
            }
        }
    }
    return null;
}

function getResponse(text) {
    // 处理有更新资讯的高价值客户请求 - 优先判断
    if (text.includes('有更新资讯的高价值客户') || text.includes('高价值客户')) {
        const highValueCustomers = [
            {
                '客户类型': '高价值客户',
                '客户名称': '深圳荣耀智能机器有限公司',
                '行业': '制造',
                '一级子行业': '电子设备制造',
                '二级子行业': '通信设备',
                '战区': '深圳战区',
                '大区': '华南大区',
                '行业纵队': '制造',
                '新闻标题': '荣耀"闪电"机器人破"半马"纪录，深圳"场景森林"孕育AI冠军',
                '新闻链接': 'https://www.nfnews.com/content/WyjqAqBEo0.html',
                '新闻摘要': '2026年4月19日，荣耀"闪电"机器人在北京亦庄人形机器人半马夺冠，以50分26秒破人类纪录，其核心技术展现公司具身智能领域工程化实力。'
            },
            {
                '客户类型': '高价值客户',
                '客户名称': '北京京东世纪贸易有限公司',
                '行业': '流通',
                '一级子行业': '贸易与批发',
                '二级子行业': '贸易与批发',
                '战区': '江苏战区',
                '大区': '华东大区',
                '行业纵队': '服务及其他',
                '新闻标题': '超6亿落子钱江世纪城，京东这把决定重仓杭州',
                '新闻链接': 'http://m.toutiao.com/group/7630762867125469742/',
                '新闻摘要': '2026年4月20日，京东全资子公司以6.63亿元竞得杭州钱江世纪城用地，用于建设浙江区域中心总部，落地与萧山区政府的战略合作。'
            }
        ];
        return JSON.stringify(highValueCustomers);
    }
    
    // 处理标讯请求
    if (text.includes('标讯处理') || text.includes('处理标讯')) {
        try {
            const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, 'ISG历史下发标讯260324-simple.json'), 'utf-8'));
            const top5Data = jsonData.slice(0, 5);
            return JSON.stringify(top5Data);
        } catch (e) {
            console.error('读取标讯文件失败:', e);
            const dialog = findDialog(text);
            return dialog ? dialog.response || '标讯文件读取失败' : '标讯文件读取失败';
        }
    }
    
    // 处理任务查看请求
    if (text.includes('显示我的任务') || text.includes('任务查看') || text.includes('任务列表')) {
        const tasks = [
            {
                '任务类型': '客户拜访',
                '客户名称': '深圳荣耀智能机器有限公司',
                '任务状态': '已指派',
                '拜访场景': '技术人员协同技术交流',
                '咨询专家': 'xxx，xxx'
            },
            {
                '任务类型': '客户拜访',
                '客户名称': '北京京东世纪贸易有限公司',
                '任务状态': '已指派',
                '拜访场景': '背后关系渠道拜访',
                '咨询专家': ''
            }
        ];
        return JSON.stringify(tasks);
    }
    
    // 处理客户动态请求
    if (text.includes('我的客户动态') || text.includes('客户动态')) {
        const customerNews = [
            {
                '客户名称': '比亚迪',
                '动态内容': '近期比亚迪位于西安西咸新区的动力电池生产基地进入全面量产冲刺阶段，项目总投资约70 亿元，占地 1333 亩，主打新一代刀片电池，规划年产能16GWh，可配套约 70 万辆新能源汽车装车需求，进一步夯实公司在动力电池自研自产的核心优势，保障主力车型产能供应。'
            },
            {
                '客户名称': '宁德时代',
                '动态内容': '2026 年 4 月 15 日，宁德时代发布公告，计划在厦门投资300 亿元成立时代资源集团，专注锂、镍、钴、锰等关键电池原材料的勘探、开发、投资与贸易，通过纵向整合稳定上游供应链，降低原材料价格波动风险，保障全球动力电池产能扩张的资源需求。'
            },
            {
                '客户名称': '宁德时代 × 长安汽车',
                '动态内容': '2026 年 3 月底，宁德时代与长安汽车合资的重庆动力电池项目正式开工，总投资约55 亿元，占地约 1000 亩，规划年产能25GWh，预计 2027 年投产。项目主要配套阿维塔、深蓝、长安启源等车型，实现本地化供应、降本增效，深化与主流车企的战略合作。'
            }
        ];
        return JSON.stringify(customerNews);
    }
    
    const dialog = findDialog(text);
    if (dialog) {
        // 处理标讯转商机请求
        if (text.includes('标讯转商机')) {
            // 从文本中提取采购单位名称
            const match = text.match(/^(.*?) 标讯转商机$/);
            const purchaseUnit = match ? match[1] : '';
            
            // 生成随机ID
            const randomCdbid = Math.floor(Math.random() * 100000000).toString();
            const randomBidId = Math.floor(Math.random() * 100000000).toString();
            
            const opportunities = [{
                '商机名称': purchaseUnit ? `${purchaseUnit} 项目` : '根据所在标讯卡片生成',
                '商机所属BU': 'REL',
                '商机模板': '标准产品和简单方案',
                '商机来源': '标讯',
                '客户CDBID': randomCdbid,
                '产品域': '标准产品',
                '采购模式': '普通采购',
                '商机金额': '1200000',
                '标讯招标时间': '2026-04-01',
                '标讯ID': randomBidId
            }];
            return JSON.stringify(opportunities);
        }
        
        if (dialog.responseFile) {
            try {
                return fs.readFileSync(path.join(__dirname, dialog.responseFile), 'utf-8');
            } catch (e) {
                console.error('读取文件失败:', e);
                return dialog.response || '文件读取失败';
            }
        }
        return dialog.response;

        
        if (dialog.responseFile) {
            try {
                return fs.readFileSync(path.join(__dirname, dialog.responseFile), 'utf-8');
            } catch (e) {
                console.error('读取文件失败:', e);
                return dialog.response || '文件读取失败';
            }
        }
        return dialog.response;
    }
    const defaultResponses = config.defaultResponses;
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

function getThinkingSteps(text) {
    const dialog = findDialog(text);
    if (dialog && dialog.thinking) {
        return dialog.thinking;
    }
    return config.defaultThinking;
}

function getSuggestions(text) {
    const dialog = findDialog(text);
    if (dialog && dialog.suggestions) {
        return dialog.suggestions;
    }
    return [];
}

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.md': 'text/plain',
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { message } = JSON.parse(body);
                const response = getResponse(message);
                const thinking = getThinkingSteps(message);
                const suggestions = getSuggestions(message);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response, thinking, suggestions }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    let filePath = req.url === '/' ? './index.html' : '.' + req.url;
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile('./index.html', (err, content) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = config.port;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open your browser and visit the address above to test the application');
});
