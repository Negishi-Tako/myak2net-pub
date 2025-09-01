This API provides authentication and user-related functionalities. It uses JWT for authentication, stored in a signed cookie.

## Authentication

Authentication is handled via JSON Web Tokens (JWT). Upon successful login, a JWT is issued and stored in an `auth_token` signed cookie. This cookie must be sent with subsequent authenticated requests.

-   **JWT Secret**: The JWT secret is read from the `JWT_SECRET` environment variable or defaults to `a-very-secure-and-long-secret-key`.
-   **Cookie Name**: The authentication token is stored in a cookie named `auth_token`.
-   **Cookie Properties**:
    -   `path`: `/`
    -   `httpOnly`: `true`
    -   `secure`: `true` in production environment, `false` otherwise.
    -   `sameSite`: `Lax`

## Endpoints

### Sessions

#### `POST /sessions`

-   **Description**: Authenticates a user and issues a JWT.
-   **Request Body**:
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "message": "Logged in successfully"
        }
        ```
        (Sets `auth_token` cookie)
    -   `401 Unauthorized`:
        ```json
        {
          "message": "Invalid credentials"
        }
        ```

#### `DELETE /sessions/current`

-   **Description**: Logs out the current user by deleting the authentication cookie.
-   **Authentication**: Not required (but typically used by an authenticated user).
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "message": "Logged out successfully"
        }
        ```
        (Deletes `auth_token` cookie)

### Users

#### `PATCH /users/:id/abuseipdb-key`

-   **Description**: Updates the AbuseIPDB API key for a user.
-   **Authentication**: Required (self or admin).
-   **Path Parameters**:
    -   `id`: User ID
-   **Request Body**:
    ```json
    {
      "abuseipdbApiKey": "your-api-key-here"
    }
    ```
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "message": "AbuseIPDB APIキーを更新しました",
          "user": {
            "id": "user-id",
            "email": "user@example.com",
            "accountType": "admin",
            "abuseipdbApiKey": "your-api-key-here"
          }
        }
        ```
    -   `403 Forbidden`:
        ```json
        {
          "message": "Forbidden"
        }
        ```
    -   `500 Internal Server Error`:
        ```json
        {
          "message": "AbuseIPDB APIキーの更新に失敗しました"
        }
        ```

#### `GET /users/me`

-   **Description**: Retrieves the information of the currently authenticated user.
-   **Authentication**: Required.
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "user": {
            "username": "string"
          }
        }
        ```
    -   `401 Unauthorized`:
        ```json
        {
          "message": "Unauthorized"
        }
        ```
        or
        ```json
        {
          "message": "Invalid token"
        }
        ```

### Logs

#### `POST /log/import`

-   **Description**: Imports SSH logs from the server's auth.log file into the database.
-   **Authentication**: Required.
-   **Request Body**: None (reads from server's auth.log file).
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "success": true,
          "totalLines": 1000,
          "parsedLines": 950,
          "insertedCount": 800,
          "skippedCount": 150,
          "errors": ["Optional array of error messages"]
        }
        ```
    -   `404 Not Found`:
        ```json
        {
          "error": "auth.log file not found"
        }
        ```
    -   `500 Internal Server Error`:
        ```json
        {
          "error": "Failed to import SSH logs",
          "details": "Error details"
        }
        ```

#### `GET /log/`

-   **Description**: Retrieves SSH logs with pagination and optional filtering.
-   **Authentication**: Required.
-   **Query Parameters**:
    -   `page` (optional): Page number (default: 1)
    -   `limit` (optional): Number of logs per page (default: 50)
    -   `logType` (optional): Filter by log type
    -   `ipAddress` (optional): Filter by IP address (partial match)
    -   `username` (optional): Filter by username (partial match)
    -   `startDate` (optional): Filter logs from this date (ISO format)
    -   `endDate` (optional): Filter logs to this date (ISO format)
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "logs": [
            {
              "id": "string",
              "timestamp": "2025-01-01T00:00:00.000Z",
              "hostname": "string",
              "service": "sshd",
              "pid": 1234,
              "username": "string",
              "ipAddress": "192.168.1.1",
              "port": 22,
              "action": "string",
              "message": "string",
              "logType": "SSH_AUTH_FAIL"
            }
          ],
          "pagination": {
            "page": 1,
            "limit": 50,
            "total": 1000,
            "totalPages": 20
          },
          "filters": {
            "logType": "SSH_AUTH_FAIL",
            "ipAddress": "192.168",
            "username": "root",
            "startDate": "2025-01-01",
            "endDate": "2025-01-02"
          }
        }
        ```

#### `DELETE /log/`

-   **Description**: Deletes all SSH logs from the database.
-   **Authentication**: Required.
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "success": true,
          "message": "全ての SSH ログ（1000件）が削除されました",
          "deletedCount": 1000,
          "previousCount": 1000
        }
        ```

#### `GET /log/query`

-   **Description**: Retrieves analytics data for SSH logs.
-   **Authentication**: Required.
-   **Query Parameters**:
    -   `timeRange` (optional): Time range for analysis (7d, 30d, 90d, default: 7d)
    -   `type` (optional): Query type (analytics, summary, detailed, default: analytics)
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "timeRange": "7d",
          "period": {
            "startDate": "2025-01-01T00:00:00.000Z",
            "endDate": "2025-01-08T00:00:00.000Z"
          },
          "queryType": "analytics",
          "logTypeStats": [
            {
              "logType": "SSH_AUTH_FAIL",
              "count": 500
            }
          ],
          "dailyStats": [
            {
              "date": "2025-01-01",
              "logType": "SSH_AUTH_FAIL",
              "count": 100
            }
          ],
          "topIpAddresses": [
            {
              "ipAddress": "192.168.1.1",
              "count": 50
            }
          ],
          "userStats": [
            {
              "username": "root",
              "count": 200
            }
          ],
          "hourlyStats": [
            {
              "hour": 0,
              "count": 10
            }
          ],
          "actionStats": [
            {
              "action": "Disconnected from invalid user",
              "count": 25
            },
            {
              "action": "Authentication failed",
              "count": 150
            }
          ]
        }
        ```

#### `DELETE /log/cleanup`

-   **Description**: Deletes SSH logs older than the specified number of days.
-   **Authentication**: Required.
-   **Query Parameters**:
    -   `days` (optional): Number of days (default: 30)
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "success": true,
          "message": "30日より古いログ（500件）が削除されました",
          "deletedCount": 500,
          "cutoffDate": "2024-12-01T00:00:00.000Z",
          "daysOld": 30
        }
        ```

#### `GET /log/abuseipdb/:ipAddress`

-   **Description**: Queries AbuseIPDB API for IP address reputation information using the official AbuseIPDB API v2.
-   **Authentication**: Required.
-   **Path Parameters**:
    -   `ipAddress`: The IP address to check
-   **Internal API Call**: 
    -   Method: `GET https://api.abuseipdb.com/api/v2/check`
    -   Headers: `Accept: application/json`, `Key: {user_api_key}`
    -   Query Parameters: `ipAddress`, `maxAgeInDays=90`
-   **Responses**:
    -   `200 OK`:
        ```json
        {
          "success": true,
          "ipAddress": "118.25.6.39",
          "data": {
            "ipAddress": "118.25.6.39",
            "isPublic": true,
            "ipVersion": 4,
            "isWhitelisted": false,
            "abuseConfidenceScore": 100,
            "countryCode": "CN",
            "countryName": "China",
            "usageType": "Data Center/Web Hosting/Transit",
            "isp": "Tencent Cloud Computing (Beijing) Co. Ltd",
            "domain": "tencent.com",
            "hostnames": [],
            "isTor": false,
            "totalReports": 1,
            "numDistinctUsers": 1,
            "lastReportedAt": "2018-12-20T20:55:14+00:00"
          }
        }
        ```
    -   `400 Bad Request`:
        ```json
        {
          "error": "AbuseIPDB APIキーが設定されていません",
          "message": "ユーザー設定でAPIキーを設定してください"
        }
        ```
    -   `500 Internal Server Error`:
        ```json
        {
          "error": "AbuseIPDB APIへの問い合わせに失敗しました",
          "details": "Error details"
        }
        ```