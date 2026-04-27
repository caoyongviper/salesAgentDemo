# 销售智能体 Demo

## 部署到 Netlify

### 方法一：直接连接 GitHub 仓库（推荐）

1. 在 [Netlify](https://app.netlify.com) 注册账号
2. 点击 "Add new site" -> "Import an existing project"
3. 连接你的 GitHub 仓库
4. 配置部署设置：
   - **Base directory**: 留空
   - **Build command**: `npm run build`
   - **Publish directory**: `.`
5. 点击 "Deploy site"

### 方法二：使用 Netlify CLI 本地部署

1. 安装 Netlify CLI：
```bash
npm install -g netlify-cli
```

2. 登录 Netlify：
```bash
netlify login
```

3. 初始化并部署：
```bash
netlify init
netlify deploy --prod
```

### 本地开发测试

```bash
npm run dev
```

访问 http://localhost:8888 预览

## 项目结构

```
├── functions/          # Netlify Functions (后端API)
│   ├── api.js         # 主API函数
│   └── chat.js        # 聊天函数
├── index.html         # 主页
├── script.js          # 前端脚本
├── style.css          # 样式
├── netlify.toml       # Netlify配置
├── package.json       # 项目配置
└── *.png/*.json       # 资源文件
```

## 功能说明

- ✅ 任务列表展示
- ✅ 标讯处理
- ✅ 高价值客户动态
- ✅ 客户洞察分析
- ✅ 响应式设计，支持移动端
