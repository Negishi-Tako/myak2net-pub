# サーバーAPI ドキュメント

## 概要

このAPIは、SSHログとUFWログの管理システムを提供します。Honoフレームワークを使用して構築されており、JWT認証とロールベースのアクセス制御を実装しています。

**ベースURL**: `http://localhost:3000`

## 認証

### 認証方式
- JWT（JSON Web Token）を使用
- Cookieベースの認証（`auth_token`）
- トークンの有効期限: 1時間

### 認証レベル
- `user`: 一般ユーザー
- `admin`: 管理者
- `superadmin`: スーパー管理者

## エンドポイント一覧

### ヘルスチェック

#### GET /health
サーバーの状態を確認します。

**レスポンス**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## セッション管理

### POST /sessions
ユーザーログイン

**リクエストボディ**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス**:
- 成功 (200): `{ "message": "Logged in successfully" }`
- 失敗 (401): `{ "message": "Invalid credentials" }`

### DELETE /sessions/current
ユーザーログアウト

**レスポンス**:
```json
{
  "message": "Logged out successfully"
}
```

---

## ユーザー管理

### GET /users/me
現在のユーザー情報を取得

**認証**: 必須

**レスポンス**:
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "accountType": "user",
    "abuseipdbApiKey": "api-key-optional"
  }
}
```

### GET /users/me/roles
現在のユーザーのロール一覧を取得

**認証**: 必須

**レスポンス**:
```json
{
  "roles": [
    {
      "id": "role-id",
      "name": "role-name"
    }
  ]
}
```

### GET /users
全ユーザー一覧を取得

**認証**: 必須（管理者のみ）

**レスポンス**:
```json
{
  "users": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "accountType": "user",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /users
新規ユーザー作成

**認証**: 必須（管理者のみ）

**リクエストボディ**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "accountType": "user"
}
```

**レスポンス**:
- 成功 (201): `{ "user": { ... } }`
- 失敗 (400): `{ "message": "Email and password are required" }`
- 失敗 (409): `{ "message": "Failed to create user. Email may already be in use." }`

### DELETE /users/:id
ユーザー削除

**認証**: 必須（管理者のみ）

**レスポンス**:
- 成功 (200): `{ "message": "User deleted successfully" }`
- 失敗 (400): `{ "message": "You cannot delete yourself." }`
- 失敗 (403): `{ "message": "Forbidden: You do not have permission to delete a superadmin." }`

### PATCH /users/:id/role
ユーザーのロール更新

**認証**: 必須（管理者のみ）

**リクエストボディ**:
```json
{
  "accountType": "admin"
}
```

**レスポンス**:
- 成功 (200): `{ "message": "User role updated successfully", "user": { ... } }`
- 失敗 (400): `{ "message": "You cannot change your own role." }`

### PUT /users/:id/roles/:roleId
ユーザーにロールを割り当て

**認証**: 必須（管理者のみ）

**リクエストボディ** (オプション):
```json
{
  "grade": "1",
  "class": "A",
  "classnum": "1",
  "team": "team1",
  "teamnum": "1"
}
```

**レスポンス**:
```json
{
  "userRole": {
    "userId": "user-id",
    "roleId": "role-id",
    "grade": "1",
    "class": "A",
    "classnum": "1",
    "team": "team1",
    "teamnum": "1"
  }
}
```

### DELETE /users/:id/roles/:roleId
ユーザーからロールを削除

**認証**: 必須（管理者のみ）

**レスポンス**:
```json
{
  "message": "Role removed"
}
```

### GET /users/:id/roles
ユーザーのロール一覧を取得

**認証**: 必須（自分自身または管理者）

**レスポンス**:
```json
{
  "userRoles": [
    {
      "userId": "user-id",
      "roleId": "role-id",
      "role": {
        "id": "role-id",
        "name": "role-name"
      }
    }
  ]
}
```

---

## ロール管理

### GET /roles
全ロール一覧を取得

**認証**: 必須

**レスポンス**:
```json
{
  "roles": [
    {
      "id": "role-id",
      "name": "role-name"
    }
  ]
}
```

### POST /roles
新規ロール作成

**認証**: 必須（管理者のみ）

**リクエストボディ**:
```json
{
  "name": "new-role-name"
}
```

**レスポンス**:
- 成功 (201): `{ "role": { ... } }`
- 失敗 (400): `{ "message": "Role name is required" }`
- 失敗 (409): `{ "message": "Role name already exists" }`

### DELETE /roles/:id
ロール削除

**認証**: 必須（管理者のみ）

**レスポンス**:
```json
{
  "message": "Role deleted"
}
```

---

## ログ管理

### SSHログ関連

#### POST /log/import
SSHログファイルをインポート

**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "importedCount": 100,
  "message": "SSH logs imported successfully"
}
```

#### GET /log/
SSHログ一覧を取得

**認証**: 必須

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 50）
- `logType`: ログタイプ
- `ipAddress`: IPアドレス
- `username`: ユーザー名
- `startDate`: 開始日
- `endDate`: 終了日

**レスポンス**:
```json
{
  "logs": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

#### DELETE /log/
全SSHログを削除

**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "deletedCount": 1000,
  "message": "All SSH logs deleted successfully"
}
```

#### GET /log/query
SSHログ分析データを取得

**認証**: 必須

**クエリパラメータ**:
- `timeRange`: 時間範囲（デフォルト: "7d"）
- `type`: クエリタイプ（デフォルト: "analytics"）

**レスポンス**:
```json
{
  "analytics": {
    "totalLogs": 1000,
    "uniqueIPs": 50,
    "topIPs": [...],
    "topUsernames": [...],
    "dailyStats": [...]
  }
}
```

#### DELETE /log/cleanup
古いSSHログを削除

**認証**: 必須

**クエリパラメータ**:
- `days`: 削除する日数（デフォルト: 30）

**レスポンス**:
```json
{
  "success": true,
  "deletedCount": 500,
  "message": "Old SSH logs cleaned up successfully"
}
```

#### GET /log/abuseipdb/:ipAddress
AbuseIPDB APIでIPアドレスをチェック

**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "ipAddress": "192.168.1.1",
  "data": {
    "ipAddress": "192.168.1.1",
    "isPublic": true,
    "ipVersion": 4,
    "isWhitelisted": false,
    "abuseConfidenceScore": 0,
    "countryCode": "JP",
    "usageType": "Data Center/Web Hosting/Transit",
    "isp": "Example ISP",
    "domain": "example.com",
    "hostnames": [],
    "totalReports": 0,
    "numDistinctUsers": 0,
    "lastReportedAt": null
  }
}
```

### UFWログ関連

#### GET /log/ufw
UFWログ一覧を取得

**認証**: 必須

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 50）
- `logType`: ログタイプ
- `ipAddress`: IPアドレス
- `protocol`: プロトコル
- `startDate`: 開始日
- `endDate`: 終了日

**レスポンス**:
```json
{
  "logs": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

#### GET /log/ufw/analytics
UFWログ分析データを取得

**認証**: 必須

**クエリパラメータ**:
- `timeRange`: 時間範囲（デフォルト: "7d"）
- `queryType`: クエリタイプ（デフォルト: "detailed"）

**レスポンス**:
```json
{
  "analytics": {
    "totalLogs": 500,
    "uniqueIPs": 25,
    "topIPs": [...],
    "protocolStats": [...],
    "dailyStats": [...]
  }
}
```

#### POST /log/ufw/import
UFWログファイルをインポート

**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "importedCount": 200,
  "message": "UFW logs imported successfully"
}
```

#### DELETE /log/ufw/cleanup
古いUFWログを削除

**認証**: 必須

**クエリパラメータ**:
- `days`: 削除する日数（デフォルト: 30）

**レスポンス**:
```json
{
  "success": true,
  "deletedCount": 100,
  "message": "Old UFW logs cleaned up successfully"
}
```

#### DELETE /log/ufw/all
全UFWログを削除

**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "deletedCount": 500,
  "message": "All UFW logs deleted successfully"
}
```

---

## エラーレスポンス

### 共通エラーレスポンス

#### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "message": "Forbidden: Admin access required"
}
```

#### 404 Not Found
```json
{
  "message": "User not found."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to fetch SSH logs"
}
```

---

## データ型

### User
```typescript
{
  id: string;
  email: string;
  accountType?: string;
  abuseipdbApiKey?: string;
}
```

### JWTPayload
```typescript
{
  sub: string;
  exp: number;
  accountType?: string;
  email?: string;
}
```

---

## 注意事項

1. **認証**: ほとんどのエンドポイントは認証が必要です
2. **権限**: 管理者機能は`admin`または`superadmin`権限が必要です
3. **スーパー管理者**: `superadmin`のみが他のスーパー管理者を作成・削除できます
4. **AbuseIPDB**: IPアドレスチェック機能を使用するには、ユーザー設定でAPIキーを設定する必要があります
5. **ログファイル**: ログインポート機能は、サーバー上の特定のファイルパスを参照します

---

## 開発環境

- **フレームワーク**: Hono
- **データベース**: Prisma (SQLite/PostgreSQL)
- **認証**: JWT
- **ポート**: 3000
