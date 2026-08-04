<div align="center">

# PlanForge FE

**酒店运营与前台的 Web 界面**

从预订到夜审、经营报表 —— 现场真正使用的画面。所有数据均在服务端组件中调用 BE 获取。

[한국어](README.md) · [English](README.en.md) · **中文** · [日本語](README.ja.md)

![TSX](https://img.shields.io/badge/TSX-67.0%25-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-26.2%25-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-1.7%25-083FA1?style=flat-square)
![YAML](https://img.shields.io/badge/YAML-1.3%25-CB171E?style=flat-square)
![CSS](https://img.shields.io/badge/CSS-0.9%25-1572B6?style=flat-square&logo=css3&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-0.5%25-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## 项目背景

酒店前台**要在同一个画面上同时处理多件事**。客人就站在面前，你要查预订、分房、制卡、收款。
因此这套界面优先保证的是**当前状态一目了然**，而不是外观华丽。

三条原则贯穿其中。

**服务端组件优先** —— 数据一律在服务端获取，客户端组件只出现在需要表单状态的地方。
`cache: 'no-store'` 保证始终看到最新状态；即便 BE 无响应，路由也不会崩溃，而是在画面上给出
错误提示。

**不隐藏结果** —— OPERA 或支付网关拒绝时，原样展示其原因。只显示「处理失败」的界面，会让前台
无从判断该修正什么。

**不隐藏模拟模式** —— 门锁与支付若运行在模拟模式，界面会明确说明。这可以避免员工以为已制卡、
而客人却打不开房门的情况。

### 平台构成

| 仓库                                                                                  | 职责                                |
| ------------------------------------------------------------------------------------- | ----------------------------------- |
| **PlanForge-Package-FE**                                                              | **运营 / 前台 Web 界面**            |
| [PlanForge-Package-BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)     | 业务逻辑 · 自有数据库               |
| [PlanForge-Package-Core](https://github.com/PlanForge-Package/PlanForge-Package-Core) | Oracle OPERA（OHIP）对接 API 服务器 |

调用链路：`FE → BE → Core → OPERA Cloud (OHIP)`

---

## 语言与技术栈

| 分类   | 技术                                                   |
| ------ | ------------------------------------------------------ |
| 语言   | TypeScript 5.9（strict）                               |
| 框架   | Next.js 15（App Router · 服务端组件 · Server Actions） |
| UI     | React 19                                               |
| 样式   | Tailwind CSS 4（`@theme` 令牌 · 支持深色模式）         |
| 状态   | `useActionState` —— 未引入额外状态库                   |
| 认证   | httpOnly Cookie + 中间件 + 布局守卫                    |
| 质量   | ESLint · Prettier · GitHub Actions                     |
| 部署   | Docker（standalone 产物 · 非 root 运行）               |
| 包管理 | pnpm 9                                                 |

### 设计令牌

```css
--color-ink: #333d4b /* 正文 */ --color-muted: #8b95a1 /* 辅助文字 */ --color-brand: #3182f6
  /* 按钮 */ --color-brand-hover: #2272eb /* 按钮悬停 */;
```

---

## 目录结构

```
src/
├── app/
│   ├── login/                    登录（公开）
│   ├── logout/route.ts           清理 Cookie —— 只能在路由处理器中进行
│   └── (app)/                    需要认证 —— 布局调用 requireUser()
│       ├── page.tsx              仪表盘
│       ├── reservations/         列表 · 新建 · 详情（修改 · 入住 · 账单 · 房卡 · 支付）
│       ├── blocks/               团队房控 · 详情（配额表 · 房单）
│       ├── profiles/             客史检索 · 详情（住店记录 · 重复合并）
│       ├── rooms/                房态
│       ├── housekeeping/         任务分配 · 进度 · 差异
│       ├── night-audit/          夜审检查表 · No-show
│       ├── cashier/             班次收款汇总 · 结班
│       ├── reports/              出租率 · ADR · RevPAR · 渠道拆解
│       ├── pos-outlets/          POS 门店密钥管理
│       ├── users/                账号管理（管理员）
│       └── account/              我的账号
├── components/
│   ├── action-feedback.tsx       ActionMessage · SubmitButton（提交中禁用）
│   ├── nav.tsx                   按角色显示的菜单 · 酒店选择器
│   ├── booking-form.tsx          选择房况 → 填写客人信息 → 预订
│   ├── front-desk.tsx            入住 · 退房
│   ├── folio-panel.tsx           账单 · 入账 · 账窗间转移
│   ├── folio-routing-panel.tsx   路由指令（交易码 → 账窗）
│   ├── payment-panel.tsx         授权 · 请款 · 撤销 · 退款
│   ├── room-key-panel.tsx        房卡制卡 · 作废
│   ├── room-outage-panel.tsx     房间停用登记 · 解除
│   ├── block-form.tsx            房控创建 · 修改
│   ├── profile-editor.tsx        偏好 · 会员 · 备注 · 合并
│   ├── outlet-admin.tsx          POS 门店发放 · 换发
│   ├── housekeeping-board.tsx    任务分配 · 进度
│   ├── night-audit-board.tsx     检查表 · No-show
│   ├── cashier-panel.tsx         开班 · 结班 · 历史班次
│   ├── trace-panel.tsx           预订指示登记 · 处理
│   ├── daily-traces.tsx          今日指示（仪表盘）
│   └── notice.tsx                ErrorNotice · InfoNotice · EmptyState
├── lib/
│   ├── api.ts                    apiFetch（仅服务端）· ApiError · tryFetch
│   ├── action-state.ts           ActionState · 失败时保留输入
│   ├── auth.ts                   requireUser · logoutUrl
│   ├── property.ts               所选酒店上下文
│   ├── types.ts                  BE 响应类型
│   ├── channel-labels.ts         预订来源代码的显示名
│   └── profile-labels.ts         偏好代码的显示名
└── middleware.ts                 无 Cookie 时跳转 /login
```

---

## 运行方式

### 环境要求

- Node.js 20.11 以上
- pnpm 9
- 已启动的 [PlanForge BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)

### 安装与启动

```bash
pnpm install
cp .env.example .env.local     # 设置 BE_BASE_URL
pnpm dev -- -p 3200
```

访问 `http://localhost:3200`。种子账号为 `manager@planforge.local`，密码 `planforge`（详见 BE
仓库）。

### 常用命令

| 命令                                           | 说明            |
| ---------------------------------------------- | --------------- |
| `pnpm dev`                                     | 开发服务器      |
| `pnpm build` / `pnpm start`                    | 构建 / 生产运行 |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | 质量检查        |

### 环境变量

| 名称                      | 说明                                         |
| ------------------------- | -------------------------------------------- |
| `BE_BASE_URL`             | BE 地址（仅服务端组件 · 可使用容器内网地址） |
| `CORE_BASE_URL`           | Core 地址                                    |
| `NEXT_PUBLIC_BE_BASE_URL` | 浏览器侧需要时的备用值                       |

---

## 页面

| 路径                         | 说明                                                     |
| ---------------------------- | -------------------------------------------------------- |
| `/`                          | 仪表盘 —— 当日抵店 · 离店 · 在住、房态概览               |
| `/reservations`              | 预订列表 —— 按确认号 / 姓名检索，按状态与渠道筛选        |
| `/reservations/new`          | 新建预订 —— 查询房况与房价后创建                         |
| `/reservations/[id]`         | 预订详情 —— 修改 · 取消、入住 / 退房、账单、房卡、支付   |
| `/blocks` `/blocks/[id]`     | 团队房控 —— 配额与实收、按日配额表、房单                 |
| `/profiles` `/profiles/[id]` | 客史档案 —— 检索、住店记录、重复合并                     |
| `/rooms`                     | 房间 —— 房态变更（委托 OPERA）、在住情况、停用登记与解除 |
| `/housekeeping`              | 客房 —— 任务分配 · 进度、差异确认                        |
| `/night-audit`               | 夜审 —— 结账检查表、No-show 处理                         |
| `/cashier`                   | 结班 —— 按班次汇总收款与点钞                             |
| `/reports`                   | 经营 —— 出租率 · ADR · RevPAR、渠道拆解（经理）          |
| `/pos-outlets`               | POS 门店 —— 密钥发放 · 换发 · 停用（经理）               |
| `/users`                     | 账号管理 —— 入职 · 角色 · 离职（管理员）                 |
| `/account`                   | 我的账号 —— 修改密码                                     |

---

## 设计取舍

### 认证

访问令牌存放于 **httpOnly Cookie**。`localStorage` 只要一次 XSS 成功便会整体泄露，而 httpOnly
Cookie 无法被脚本读取。

保护共三层。

1. **中间件** —— 没有 Cookie 时跳转 `/login`，但不校验签名。这样既不把密钥打包进边缘运行时，
   也避免校验规则分散在两处。
2. **`(app)` 布局** —— 通过 `requireUser()` 在每次请求时向 BE 确认账号状态，新增页面不会漏掉
   保护。
3. **BE 守卫** —— 真正的拦截在此。隐藏菜单只是便利性措施。

过期或伪造的令牌由 `/logout` 路由处理器清除 Cookie 并跳转登录。Cookie 只能在 Server Actions 与
路由处理器中修改，若在布局中清除会抛出异常，用户将被困在错误页面。

### 多酒店

导航栏的酒店选择器决定整个界面的基准酒店，选择结果以 Cookie 保存 12 小时。优先级为：Cookie →
账号归属 → 第一家酒店。

酒店由选择器决定，而非 URL。若通过查询字符串传递，会给人「改地址就能看别家酒店」的错觉 ——
实际判断始终在 BE。

已指定归属的员工只会收到自己所属的一家酒店，因此显示酒店名称而非选择器。既没有理由展示无法
选择的项，列表中出现其他酒店的名称本身也会暴露组织结构。

### 表单动作

动作不抛异常，而是以 `ActionState` 返回结果 —— Server Action 抛出异常时，Next 会在生产环境抹去
消息只留 digest，用户便无从得知该修正什么。

失败的动作**会连同已填写的值一并返回**（`ActionState.values`）。React 19 在表单动作结束后会重置
非受控输入，若不回传，填满日期与数量的表单会被清空、只剩一行错误。界面会把这些值重新作为
`defaultValue` 植入。

动作状态由**承载这些行的面板**持有，而非行本身。已处理的条目会从列表中消失，绑定在行上的消息
也会随之消失。展示的消息遵循**最后执行的动作**，而非固定优先级。

### 幂等键

支付表单的幂等键由 `crypto.randomUUID()` 每次重新生成。**不可**使用 `useId()` —— 它由组件位置
决定，每次打开页面都相同，于是新的支付会被当作上一次支付的重发：**实际未扣款，却把另一笔金额
报告为成功。**

服务端渲染时留空，挂载后再填充；若以随机值作为初始状态，会导致水合不一致。

---

## 部署

```bash
docker build -t planforge-fe .
```

采用 Next.js standalone 产物、以非 root 运行。完整栈配置请参考 BE 仓库的
`deploy/docker-compose.yml`。

---

## 许可

UNLICENSED —— 仅限公司内部使用。
