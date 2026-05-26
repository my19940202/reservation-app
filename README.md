# 心理咨询预约小程序

基于微信原生 + Vant Weapp + 云开发的咨询预约系统。

## 快速开始

```bash
npm install
```

1. 微信开发者工具打开本项目
2. **工具 → 构建 npm**
3. 创建云数据库集合：`reserve_users`、`reserve_user_packages`、`reserve_teachers`、`reserve_time_slots`、`reserve_appointments`（见 [技术文档.md](./技术文档.md) 第 5 节）
4. 上传云函数：`login`、`appointment`、`verify`、`admin`

## 文档

- [技术文档.md](./技术文档.md) — 架构、数据库、云函数、部署
- [决策.md](./决策.md) — 项目背景与 MVP 范围

## 角色

| 角色 | 入口 |
|------|------|
| 用户 | Tab 预约 / 我的 |
| 咨询师 | 我的 → 待核销 |
| 管理员 | 我的 → 管理后台 |
