# USDK Privacy Stablecoin Platform

一个支持多链的隐私稳定币平台，提供收益生成、隐私保护和透明证明功能。

## 项目结构

```
KUSD/
├── core/                    # Go 后端服务
│   ├── cmd/                 # 应用程序入口
│   ├── internal/            # 内部代码
│   │   ├── config/         # 配置管理
│   │   ├── handler/        # HTTP 处理器
│   │   ├── service/        # 业务逻辑层
│   │   ├── repository/     # 数据访问层
│   │   └── model/          # 数据模型
│   ├── pkg/                # 共享包
│   │   ├── database/       # 数据库连接
│   │   ├── middleware/     # 中间件
│   │   ├── pricefeed/      # 价格数据源
│   │   ├── riskcontrol/    # 风控系统
│   │   ├── siwe/           # 以太坊登录
│   │   ├── utils/          # 工具函数
│   │   └── wallet/         # 钱包管理
│   └── scripts/            # 数据库脚本
├── contracts/              # 智能合约
│   ├── contracts/          # Solidity 合约 (USDK.sol, ProofRegistry.sol)
│   ├── scripts/            # 部署脚本
│   └── test/               # 合约测试
├── frontend/               # 前端应用
│   └── kusd-frontend/      # React + TypeScript + Vite
└── README.md
```

## 核心功能

### 后端服务 (Go + Gin + GORM)

1. **用户管理**
   - SIWE (Sign-In with Ethereum) 登录
   - JWT 身份验证
   - 用户配置文件管理

2. **钱包功能**
   - 多链充值地址生成 (HD/MPC)
   - 提现申请和审批
   - 资产余额管理

3. **投资组合**
   - KUSD 估值计算
   - 资产分布展示
   - APY 收益展示

4. **交易记录**
   - 充值、提现、收益记录
   - 分页查询和过滤
   - 批次证明关联

5. **证明系统**
   - Merkle 批次证明生成
   - 链上证明发布
   - 透明度验证

### 智能合约 (Solidity)

1. **USDK Token** (`contracts/contracts/USDK.sol`)
   - ERC20 标准代币，支持 18 位小数
   - 基于角色的访问控制 (MINTER, BURNER, PAUSER, BLACKLISTER)
   - 铸造/销毁功能，支持批量铸造
   - 暂停机制用于紧急停机
   - 合规黑名单功能，可销毁黑名单资金
   - ERC20Permit 支持无 gas 交易授权

2. **ProofRegistry** (`contracts/contracts/ProofRegistry.sol`)
   - 批次证明注册系统，支持多种类型 (DEPOSIT, YIELD, TRADE, WITHDRAW)
   - Merkle 根存储和验证，支持链下数据透明度
   - Oracle 签名验证，确保数据可信
   - 批次验证和撤销机制
   - 支持 IPFS/Arweave 等去中心化存储链接

## 技术栈

### 后端
- **Go 1.21+** - 主要编程语言
- **Gin** - HTTP Web 框架
- **GORM** - ORM 库
- **MySQL 8.0+** - 主数据库
- **JWT** - 身份验证
- **Redis** - 缓存 (可选)

### 区块链
- **Solidity ^0.8.20** - 智能合约
- **Hardhat** - 开发框架
- **OpenZeppelin** - 安全合约库
- **Ethers.js** - 区块链交互

### 支持的网络
- Ethereum Mainnet
- Arbitrum One
- Optimism
- Polygon
- Base

## 快速开始

### 1. 环境准备

```bash
# 安装 Go 1.21+
# 安装 Node.js 18+
# 安装 MySQL 8.0+

# 克隆项目
git clone <repository-url>
cd KUSD
```

### 2. 数据库设置

```bash
# 连接 MySQL 并创建数据库
mysql -u root -p123456

# 执行建表脚本
mysql -u root -p123456 < core/scripts/init_database.sql
```

### 3. 后端服务

```bash
cd core

# 复制配置文件
cp .env.example .env

# 安装依赖
go mod tidy

# 启动服务
go run cmd/main.go
```

服务将在 `http://localhost:8080` 启动

### 4. 智能合约

```bash
cd contracts

# 安装依赖
npm install

# 编译合约
npm run build

# 运行测试
npm test

# 启动本地网络和部署
npx hardhat node
npm run deploy:localhost
```

## API 接口

### 公开接口

- `GET /api/v1/meta/supported` - 获取支持的链和资产
- `POST /api/v1/user/login-siwe` - SIWE 登录
- `GET /api/v1/proofs/latest` - 获取最新证明

### 认证接口 (需要 JWT Token)

- `GET /api/v1/user/profile` - 用户资料
- `GET /api/v1/wallet/deposit-address` - 获取充值地址
- `POST /api/v1/withdraw` - 提现申请
- `GET /api/v1/portfolio/overview` - 投资组合概览
- `GET /api/v1/records` - 交易记录

### 请求示例

```bash
# 获取支持的链
curl http://localhost:8080/api/v1/meta/supported

# SIWE 登录
curl -X POST http://localhost:8080/api/v1/user/login-siwe \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Sign-In with Ethereum message",
    "signature": "0x..."
  }'

# 获取充值地址 (需要 Authorization 头)
curl http://localhost:8080/api/v1/wallet/deposit-address?chain=ethereum&asset=USDC \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 数据库设计

### 核心表结构

- `users` - 用户信息
- `chains` - 支持的区块链
- `assets` - 支持的资产
- `deposit_addresses` - 用户充值地址
- `onchain_txs` - 链上交易记录
- `ledger_entries` - 内部账本记录
- `proof_batches` - 批次证明
- `withdraw_requests` - 提现申请

## 合约部署

### 本地开发

```bash
cd contracts

# 启动本地节点
npx hardhat node

# 部署合约
npm run deploy:localhost
```

### 测试网部署

```bash
# 设置环境变量
export PRIVATE_KEY="your-private-key"
export ETHEREUM_RPC_URL="your-rpc-url"

# 部署到 Sepolia
npm run deploy:sepolia

# 验证合约
npx hardhat verify --network sepolia CONTRACT_ADDRESS "Constructor" "Args"
```

### 主网部署

```bash
# 设置生产环境变量
export PRIVATE_KEY="your-private-key"
export ETHEREUM_RPC_URL="your-mainnet-rpc"

# 部署
npm run deploy:ethereum

# 验证
npm run verify:ethereum
```

## 安全考虑

1. **私钥管理**
   - 使用 Hardware Wallet 或 MPC
   - 多重签名钱包
   - 密钥分离存储

2. **访问控制**
   - 角色权限分离
   - API 速率限制
   - IP 白名单

3. **资金安全**
   - 冷热钱包分离
   - 提现限额控制
   - 风控规则

4. **合约安全**
   - 审计和测试
   - 暂停机制
   - 升级能力

## 开发指南

### 添加新的区块链支持

1. 在数据库 `chains` 表中添加新链
2. 在 `chain_assets` 表中配置支持的资产
3. 更新合约部署脚本
4. 在后端配置中添加 RPC 地址

### 添加新的 API 接口

1. 在 `internal/handler` 中添加处理函数
2. 在 `internal/service` 中实现业务逻辑
3. 在 `internal/repository` 中添加数据访问
4. 在 `cmd/main.go` 中注册路由

### 部署新版本合约

1. 更新合约代码
2. 运行完整测试套件
3. 在测试网部署和验证
4. 更新后端配置中的合约地址
5. 执行主网部署

## 监控和维护

### 日志监控
- 应用程序日志
- 数据库查询日志
- 区块链交互日志

### 性能监控
- API 响应时间
- 数据库连接池
- 内存和 CPU 使用

### 安全监控
- 异常交易检测
- 失败登录尝试
- 大额提现警报

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 运行测试确保通过
5. 提交 Pull Request

## 许可证

[MIT License](LICENSE)

## 联系方式

- 技术支持: [技术支持邮箱]
- 文档: [项目文档链接]
- 社区: [社区讨论链接]