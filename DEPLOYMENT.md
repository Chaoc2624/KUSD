# KUSD DeFi 部署指南

## 前提条件

1. **Node.js**: 安装 Node.js v16+ (当前支持 v18 或 v20，v23 可能有兼容性警告但仍可工作)
2. **网络访问**: 能访问以太坊 RPC 节点
3. **测试代币**: Sepolia 测试网 ETH (可通过水龙头获取)

## 获取 Sepolia 测试网 ETH

访问以下任一水龙头获取免费的 Sepolia ETH：
- https://sepoliafaucet.com/
- https://sepolia-faucet.pk910.de/
- https://faucet.paradigm.xyz/

## 部署步骤

### 1. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
```

在 `.env` 文件中设置：
```env
# Sepolia RPC URL (可使用 Alchemy/Infura 或其他提供商)
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# 部署钱包私钥 (不要包含 0x 前缀)
PRIVATE_KEY=your_private_key_here

# 用于合约验证的 Etherscan API 密钥 (可选)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译合约

```bash
npm run compile
```

如果编译成功，你会看到类似输出：
```
Compiled 51 Solidity files successfully
```

### 4. 部署到 Sepolia

```bash
npm run deploy:sepolia
```

部署过程包括以下步骤：
1. 部署 KUSD 稳定币合约 (可升级代理)
2. 部署预言机适配器
3. 部署风险管理合约
4. 部署抵押品管理合约
5. 部署 Lido 适配器 (测试网简化版)
6. 部署 RWA 金库
7. 部署 LST 金库
8. 部署主金库
9. 设置角色和权限
10. 配置支持的抵押品代币

### 5. 验证部署

部署成功后，你会看到所有合约地址的输出，部署信息会保存在 `deployments.json` 文件中。

### 6. 合约验证 (可选)

如果设置了 `ETHERSCAN_API_KEY`，可以验证合约：

```bash
# 验证特定合约
npm run verify -- --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 合约架构

部署的合约包括：

### 核心合约
- **Stablecoin (KUSD)**: ERC20 可升级稳定币
- **MasterVault**: 主金库，管理用户资金分配
- **CollateralManager**: 抵押品和借贷管理
- **RiskManager**: 风险参数管理
- **OracleAdapter**: 价格预言机适配器

### 金库合约
- **RWAVault**: 真实世界资产金库
- **LSTVault**: 流动性质押代币金库

### 适配器合约
- **LidoAdapterTestnet**: Lido 质押适配器 (测试网简化版)

## 测试网功能说明

由于这是测试网部署，某些功能已简化：

1. **Lido 集成**: 使用模拟版本，不与真实 Lido 协议交互
2. **预言机**: 使用 Chainlink Sepolia 测试网喂价 (如果可用)
3. **收益计算**: 使用模拟的 APY 计算

## 与合约交互

### 基本操作示例

```javascript
// 连接到部署的合约
const stablecoin = await ethers.getContractAt("Stablecoin", STABLECOIN_ADDRESS);
const masterVault = await ethers.getContractAt("MasterVault", MASTER_VAULT_ADDRESS);

// 查看合约信息
const name = await stablecoin.name();
const symbol = await stablecoin.symbol();
const totalAssets = await masterVault.getTotalValueLocked();

console.log(`代币: ${name} (${symbol})`);
console.log(`总锁定价值: ${totalAssets.toString()}`);
```

## 故障排除

### 常见问题

1. **Gas 不足**: 确保钱包有足够的 Sepolia ETH
2. **网络连接**: 检查 RPC URL 是否正确
3. **私钥错误**: 确保私钥格式正确，不包含 0x 前缀

### 获取帮助

如果遇到问题：
1. 检查 Hardhat 文档: https://hardhat.org/
2. 查看 OpenZeppelin 升级指南: https://docs.openzeppelin.com/upgrades-plugins/
3. 在项目 GitHub 仓库提交 issue

## 安全注意事项

⚠️ **重要安全提醒**:
- 永远不要提交真实的私钥到代码仓库
- 测试网私钥也应该与主网分开管理
- 部署到主网前进行充分测试
- 考虑进行专业安全审计

## 下一步

部署成功后，你可以：
1. 开发前端界面与合约交互
2. 编写更多测试用例
3. 实现额外的 DeFi 策略
4. 为主网部署做准备