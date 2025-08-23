# KUSD DeFi 快速开始

## 🚀 5分钟部署到 Sepolia

### 1. 准备工作
```bash
# 克隆项目 (如果还没有)
git clone <your-repo-url>
cd KUSD

# 安装依赖
npm install
```

### 2. 获取测试 ETH
访问 [Sepolia 水龙头](https://sepoliafaucet.com/) 获取免费测试 ETH

### 3. 配置环境
```bash
# 复制配置文件
cp .env.example .env

# 编辑 .env 文件，填入以下内容：
```

**最少配置 (.env):**
```env
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/demo
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
```

### 4. 编译和部署
```bash
# 编译智能合约
npm run compile

# 部署到 Sepolia
npm run deploy:sepolia
```

### 5. 验证部署
如果看到类似输出，说明部署成功：
```
✅ Deployment completed successfully!

Deployed contracts:
stablecoin: 0x1234...
masterVault: 0x5678...
collateralManager: 0x9abc...
...
```

## 🔧 开发命令

```bash
# 编译合约
npm run compile

# 运行测试
npm test

# 启动本地节点
npm run node

# 本地部署
npm run deploy:local

# 代码检查
npm run lint

# 生成 TypeScript 类型
npm run typechain
```

## 📁 项目结构

```
KUSD/
├── contracts/           # 智能合约
│   ├── core/           # 核心合约
│   ├── vaults/         # 金库合约
│   ├── adapters/       # 协议适配器
│   └── mocks/          # 测试合约
├── scripts/            # 部署脚本
├── test/              # 测试文件
├── frontend/          # 前端应用
└── deployments.json   # 部署地址 (部署后生成)
```

## 🌐 网络支持

- ✅ **Sepolia**: 测试网 (推荐)
- ✅ **Hardhat**: 本地开发
- 🚧 **Mainnet**: 准备中
- 🚧 **Arbitrum**: 计划中
- 🚧 **Optimism**: 计划中

## 🔗 有用链接

- [完整部署指南](./DEPLOYMENT.md)
- [架构文档](./CLAUDE.md)
- [Sepolia 水龙头](https://sepoliafaucet.com/)
- [Sepolia 区块浏览器](https://sepolia.etherscan.io/)

## 🆘 需要帮助?

1. 检查 [故障排除指南](./DEPLOYMENT.md#故障排除)
2. 确保钱包有足够的 Sepolia ETH
3. 验证 `.env` 配置是否正确
4. 在 GitHub 提交 issue

---

**祝部署顺利! 🎉**