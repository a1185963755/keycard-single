# 卡密验证系统

这是一个基于NestJS和TypeORM开发的卡密验证系统，使用MySQL作为数据库。系统可以生成和管理卡密，并在访问API前验证卡密的有效性。

## 功能特点

- 批量生成卡密
- 支持天卡和月卡两种类型
- 卡密首次使用后开始计算有效期
- 卡密验证接口
- 卡密有效期管理
- 查询卡密到期时间
- 自定义装饰器控制卡密验证
- 统一的响应格式

## 环境要求

- Node.js (>= 14.x)
- MySQL (>= 5.7)

## 安装与运行

1. 克隆仓库

```bash
git clone https://github.com/yourusername/kami-system.git
cd kami-system
```

2. 安装依赖

```bash
npm install
```

3. 配置数据库

编辑 `.env` 文件，修改数据库连接信息：

```
DATABASE_URL="mysql://username:password@localhost:3306/kami_system"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3000
```

4. 运行应用

```bash
npm run start
```

开发模式：

```bash
npm run start:dev
```

## 卡密类型说明

系统支持两种类型的卡密：

- **天卡**：首次使用后有效期为1天
- **月卡**：首次使用后有效期为30天

卡密生成后状态为未使用(`unused`)，当首次验证通过后状态会变为已使用(`used`)，并开始计算有效期。在有效期内，已使用的卡密依然可以继续使用。超过有效期后状态会变为过期(`expired`)。

## 卡密验证机制

系统使用全局守卫和自定义装饰器组合的方式进行卡密验证：

1. `KeyCardGuard` 被设置为全局守卫，但默认不会对任何接口进行验证
2. 只有被 `@RequireKeyCard()` 装饰器标记的控制器或方法才会进行卡密验证
3. 验证时需要在请求头中设置 `X-Key-Card` 字段

示例：

```typescript
// 需要卡密验证的接口
@Get('protected')
@RequireKeyCard()
getProtectedData() {
  return { message: '已通过卡密验证' };
}

// 不需要卡密验证的接口
@Get('public')
getPublicData() {
  return { message: '公开接口，无需卡密验证' };
}
```

## API接口说明

### 1. 创建卡密批次

```
POST /api/key-cards/batch
```

请求体：

```json
{
  "name": "测试批次",
  "count": 10,
  "type": "day"  // 可选值: "day"或"month"
}
```

### 2. 验证卡密

```
POST /api/key-cards/verify
```

请求体：

```json
{
  "code": "YOUR_KEY_CARD_CODE"
}
```

### 3. 查询卡密信息（包括到期时间）

```
GET /api/key-cards/info?code=YOUR_KEY_CARD_CODE
```

响应示例：

```json
{
  "code": "1A2B3C4D5E6F7G8H",
  "status": "used",
  "type": "month",
  "firstUseTime": "2023-06-01T12:00:00.000Z",
  "expireAt": "2023-07-01T12:00:00.000Z",
  "isExpired": false,
  "remainingDays": 15,
  "remainingTime": 1296000000,
  "message": "卡密有效，剩余15天"
}
```

### 4. 访问受保护的API

```
GET /api/key-cards/protected-data
```

请求头：

```
X-Key-Card: YOUR_KEY_CARD_CODE
```

### 5. 查看所有批次

```
GET /api/key-cards/batch
```

### 6. 根据批次ID查询卡密

```
GET /api/key-cards/batch/:id
```

### 7. 根据状态查询卡密

```
GET /api/key-cards/status/:status
```

状态可选值：`unused`, `used`, `expired`

## 开发者说明

- `src/key-cards`: 卡密相关功能
- `src/guards`: 卡密验证守卫
- `src/decorators`: 自定义装饰器
- `src/interceptors`: 响应格式转换
- `src/filters`: 异常处理
