# aieducenter-admin-web

管理后台前端项目。

基于 Next.js 15 App Router + shadcn-ui + Tailwind CSS + Zustand。

## 开发

```bash
pnpm install
pnpm dev
```

访问 http://localhost:3001

## 构建

```bash
pnpm build
```

## Docker 部署

```bash
# 生产环境
docker-compose -f docker-compose.prod.yml up -d

# 本地开发
docker-compose -f docker-compose.dev.yml up -d
```
