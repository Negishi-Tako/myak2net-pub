# マルチステージビルド: ビルドステージ
FROM node:24-alpine AS build

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# 本番用ビルドを実行
RUN npm run build

# 本番ステージ
FROM nginx:alpine AS production

# nginxの設定ファイルをコピー
COPY nginx.conf /etc/nginx/nginx.conf

# ビルドされたファイルをnginxのドキュメントルートにコピー
COPY --from=build /app/dist /usr/share/nginx/html

# ポート80を公開
EXPOSE 80

# nginxを起動
CMD ["nginx", "-g", "daemon off;"]
