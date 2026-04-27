const fs = require('fs');
const path = require('path');

function findDialog(text) {
    const dialogs = [
        {
            keywords: ['我希望看看比亚迪的情况', '比亚迪'],
            response: "客户洞察信息：\n\n（一）核心主体信息 \n官方全称：比亚迪股份有限公司 \n简称 / 品牌名：比亚迪（BYD） \n统一社会信用代码：91440300192317458F \n法定代表人：王传福 \n企业类型：民营上市公司 \n成立日期：1995 年 2 月 10 日 \n营业期限：永久存续 \n\n（二）注册与经营地址 \n注册地址：广东省深圳市坪山区比亚迪路 3009 号 \n实际经营地址：总部位于深圳坪山，国内布局西安、上海、合肥、常州等 10 大生产基地；海外设东南亚、欧洲、南美等区域分部及子公司",
            thinking: [
                '正在进行客户洞察分析...',
                '▸ 检索企业工商信息数据库',
                '▸ 提取核心主体信息',
                '▸ 解析注册地址与分支机构布局',
                '▸ 整理主营业务与资质证书',
                '▸ 信息校验完成'
            ],
            suggestions: [
                '帮我分析比亚迪最近的财务状况',
                '比亚迪主要竞争对手有哪些'
            ]
        },
        {
            keywords: ['标讯处理', '处理标讯'],
            response: "好的，我来帮您处理标讯。根据系统数据，您当前有5条待处理的标讯。",
            thinking: [
                '正在处理标讯...',
                '▸ 拉取标讯数据',
                '▸ 处理标讯数据',
                '▸ 渲染标讯数据',
                '▸ 展示标讯数据',
                '▸ 标讯处理完成'
            ],
            suggestions: [
                '帮我分析这个标讯的可行性',
                '如何跟进这个标讯'
            ]
        },
        {
            keywords: ['显示我的任务', '任务列表'],
            response: "好的，我来帮您查看任务。根据系统数据，您当前有2项待完成的任务。",
            thinking: [
                '正在查找任务列表...',
                '▸ 检索待完成任务',
                '▸ 整理任务详情',
                '▸ 任务列表整理完成'
            ],
            suggestions: [
                '帮我生成任务跟进计划',
                '提醒我明天跟进这个任务'
            ]
        },
        {
            keywords: ['我的客户动态', '客户动态'],
            response: "好的，正在为您检索客户动态。",
            thinking: [
                '正在检索客户动态...',
                '▸ 拉取最新客户动态数据',
                '▸ 整理动态内容',
                '▸ 客户动态整理完成'
            ],
            suggestions: [
                '帮我分析这条动态带来的机会',
                '帮我制定跟进策略'
            ]
        },
        {
            keywords: ['有更新资讯的高价值客户', '高价值客户'],
            response: "好的，正在为您整理高价值客户资讯。",
            thinking: [
                '正在检索高价值客户资讯...',
                '▸ 筛选近期有动态的客户',
                '▸ 整理客户基本信息',
                '▸ 提取最新新闻摘要',
                '▸ 客户资讯整理完成'
            ],
            suggestions: [
                '需要我帮您创建商机吗',
                '需要我找一下这个客户的近期所有新闻吗?'
            ]
        }
    ];

    for (const dialog of dialogs) {
        for (const keyword of dialog.keywords) {
            if (text.includes(keyword)) {
                return dialog;
            }
        }
    }
    return null;
}

function getResponse(text) {
    if (text.includes('标讯处理') || text.includes('处理标讯')) {
        try {
            const filePath = path.join(__dirname, '..', 'ISG历史下发标讯260324-simple.json');
            const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const top5Data = jsonData.slice(0, 5);
            return JSON.stringify(top5Data);
        } catch (e) {
            console.error('读取标讯文件失败:', e);
            const dialog = findDialog(text);
            return dialog ? dialog.response || '标讯文件读取失败' : '标讯文件读取失败';
        }
    }

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

    if (text.includes('我的客户动态') || text.includes('客户动态')) {
        const customerNews = [
            {
                '客户名称': '比亚迪',
                '动态内容': '近期比亚迪位于西安西咸新区的动力电池生产基地进入全面量产冲刺阶段，项目总投资约70亿元，占地1333亩，主打新一代刀片电池，规划年产能16GWh，可配套约70万辆新能源汽车装车需求。'
            },
            {
                '客户名称': '宁德时代',
                '动态内容': '2026年4月15日，宁德时代发布公告，计划在厦门投资300亿元成立时代资源集团，专注锂、镍、钴、锰等关键电池原材料的勘探、开发、投资与贸易。'
            },
            {
                '客户名称': '宁德时代 × 长安汽车',
                '动态内容': '2026年3月底，宁德时代与长安汽车合资的重庆动力电池项目正式开工，总投资约55亿元，占地约1000亩，规划年产能25GWh。'
            }
        ];
        return JSON.stringify(customerNews);
    }

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

    const dialog = findDialog(text);
    if (dialog) {
        return dialog.response;
    }

    const defaultResponses = [
        "好的，我来帮您分析这个客户需求。根据您提供的信息，这个客户主要关注以下几点...",
        "感谢您的提问！让我为您详细解答这个问题。\n\n从专业销售角度来看，关键在于抓住客户的核心痛点，然后针对性地展示我们产品的价值。",
        "我理解你的问题。根据销售经验，处理这类客户应该从以下几个方面入手..."
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

function getThinking(text) {
    const dialog = findDialog(text);
    if (dialog && dialog.thinking) {
        return dialog.thinking;
    }
    return [
        '正在处理您的请求...',
        '▸ 解析用户输入意图',
        '▸ 检索相关知识库',
        '▸ 整理分析框架',
        '▸ 生成响应内容',
        '▸ 内容校验完成'
    ];
}

function getSuggestions(text) {
    const dialog = findDialog(text);
    if (dialog && dialog.suggestions) {
        return dialog.suggestions;
    }
    return [
        '帮我分析一下这个客户需求',
        '帮我写一封跟进邮件',
        '帮我生成销售话术'
    ];
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
    }

    try {
        const { message } = JSON.parse(event.body);
        const response = getResponse(message);
        const thinking = getThinking(message);
        const suggestions = getSuggestions(message);

        return {
            statusCode: 200,
            body: JSON.stringify({
                response,
                thinking,
                suggestions
            }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};
