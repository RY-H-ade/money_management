# 个人财务管理系统 (Personal Finance Management System)

一个纯网页端的个人财务管理与记账软件，具备数据加密存储、统计分析报告及银行账单导入功能。

## 功能特性

### 1. 纯网页端
- 完全基于 HTML/CSS/JavaScript 实现
- 无需后端服务器
- 可直接在浏览器中运行
- 支持响应式设计，适配移动端和桌面端

### 2. 数据加密存储
- 使用 Web Crypto API 实现 AES-GCM 256位加密
- 采用 PBKDF2 密钥派生（10万次迭代）
- 数据加密后存储在浏览器本地（LocalStorage）
- 密码保护，确保财务数据安全

### 3. 统计分析与报告功能
- **仪表盘**：
  - 总余额显示
  - 本月收入/支出统计
  - 本月净值计算
  - 最近交易记录
  - 分类支出统计图表
- **财务报表**：
  - 按月份生成详细报表
  - 收入支出对比分析
  - 分类支出明细与占比
  - 交易笔数统计

### 4. 银行账单导入
- 支持 CSV 格式文件导入
- 自动解析多种日期格式
- 批量导入交易记录
- 导入前预览功能
- 自动创建不存在的分类

### 5. 核心功能
- **账户管理**：支持现金、银行卡、信用卡、投资账户
- **分类管理**：自定义收入/支出分类，支持颜色标记
- **交易记录**：
  - 添加/编辑/删除交易
  - 支持收入、支出、转账三种类型
  - 交易搜索与筛选
  - 按日期/账户/类型过滤
- **数据导出**：支持导出 JSON 格式数据备份

## 快速开始

### 在线使用
1. 下载项目文件
2. 直接用浏览器打开 `index.html` 文件
3. 首次使用时设置密码（密码长度至少6个字符）
4. 开始管理您的财务数据

### 本地部署
```bash
# 克隆仓库
git clone https://github.com/RY-H-ade/money_management.git

# 进入目录
cd money_management

# 使用任意 HTTP 服务器启动（可选）
# Python 3
python -m http.server 8000

# 或使用 Node.js http-server
npx http-server

# 访问 http://localhost:8000
```

## 使用说明

### 首次设置
1. 打开应用后，创建一个密码保护您的数据
2. 系统会自动创建默认账户和分类
3. 您可以根据需要添加更多账户和分类

### 添加交易
1. 点击"添加交易"按钮
2. 选择交易类型（收入/支出/转账）
3. 填写日期、金额、账户、分类等信息
4. 保存即可

### 导入银行账单
1. 准备 CSV 格式的银行账单文件
2. CSV 文件格式要求（按顺序）：
   - 第一列：日期（YYYY-MM-DD 或 YYYY/MM/DD）
   - 第二列：描述/备注
   - 第三列：金额（正数为收入，负数为支出）
   - 第四列：分类（可选）
3. 进入"导入"页面
4. 选择 CSV 文件
5. 预览导入数据
6. 确认导入

### CSV 文件示例
```csv
日期,备注,金额,分类
2025-01-15,午餐,-35.50,餐饮
2025-01-16,工资,8000.00,工资
2025-01-17,地铁,-6.00,交通
2025-01-18,购物,-299.00,购物
```

## 技术架构

### 前端技术
- **HTML5**：页面结构
- **CSS3**：样式设计（响应式布局、渐变背景、卡片设计）
- **JavaScript (ES6+)**：应用逻辑

### 核心技术实现
- **加密技术**：Web Crypto API
  - AES-GCM 对称加密
  - PBKDF2 密钥派生
  - 随机盐值和初始化向量
- **数据存储**：LocalStorage
- **文件处理**：FileReader API（CSV 导入）
- **数据导出**：Blob API

### 数据结构
```javascript
{
  accounts: [
    {
      id: string,
      name: string,
      type: 'cash' | 'bank' | 'credit' | 'investment',
      balance: number,
      initialBalance: number
    }
  ],
  categories: [
    {
      id: string,
      name: string,
      type: 'income' | 'expense',
      color: string
    }
  ],
  transactions: [
    {
      id: string,
      type: 'income' | 'expense' | 'transfer',
      date: string,
      accountId: string,
      toAccountId: string | null,
      amount: number,
      categoryId: string | null,
      note: string
    }
  ]
}
```

## 安全性说明

- 所有数据使用 AES-GCM 256位加密
- 密码不会以明文形式存储
- 加密密钥通过 PBKDF2 从密码派生，迭代10万次
- 每次加密使用随机的盐值和初始化向量
- 数据仅存储在本地浏览器，不会上传到任何服务器

## 浏览器兼容性

- Chrome/Edge 60+
- Firefox 58+
- Safari 11.1+
- Opera 47+

需要支持 Web Crypto API 的现代浏览器。

## 数据备份

强烈建议定期备份您的数据：
1. 进入"报表"页面
2. 点击"导出数据"按钮
3. 保存导出的 JSON 文件
4. 将文件存储在安全的位置

## 项目特色

- ✅ 纯前端实现，无需后端
- ✅ 数据加密存储，保护隐私
- ✅ 完整的记账功能
- ✅ 丰富的统计报表
- ✅ 支持 CSV 导入
- ✅ 响应式设计
- ✅ 简洁美观的界面
- ✅ 易于使用和部署

## 参考项目

本项目在以下优秀开源项目的启发下开发：
- [Actual Budget](https://github.com/actualbudget/actual) - 个人预算管理工具
- [Firefly III](https://github.com/firefly-iii/firefly-iii) - 个人财务管理系统

## 许可证

本项目采用 Mozilla Public License 2.0 许可证。详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 作者

RY-H-ade

## 更新日志

### v1.0.0 (2025-01-15)
- 初始版本发布
- 实现基础记账功能
- 添加数据加密存储
- 支持 CSV 导入
- 添加统计报表功能
