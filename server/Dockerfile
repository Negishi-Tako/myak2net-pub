FROM node:18-alpine

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm ci

# Prismaクライアントを生成
COPY prisma ./prisma/
RUN npx prisma generate

# ソースコードをコピー
COPY . .

# TypeScriptをコンパイル
RUN npm run build

# 非rootユーザーで実行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["npm", "start"]
