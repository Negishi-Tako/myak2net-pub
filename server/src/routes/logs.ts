import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import type { User } from '../types/auth.js';
import { importLogsFromFile, importUfwLogs } from './logImport.js';
import { getLogsWithFilters, getUfwLogsWithFilters } from './logQuery.js';
import { getAnalyticsData, getUfwAnalyticsData } from './logAnalytics.js';
import { deleteAllLogs, cleanupOldLogs, cleanupUfwLogs, deleteAllUfwLogs } from './logCleanup.js';

const logs = new Hono<{ Variables: { user: User } }>();

// ログのインポート（POST /log/import）
logs.post('/import', authMiddleware, async (c) => {
  try {
    const result = await importLogsFromFile();
    return c.json(result);
  } catch (error) {
    console.error('Error importing SSH logs:', error);
    if (error instanceof Error && error.message === 'auth.log file not found') {
      return c.json({ error: 'auth.log file not found' }, 404);
    }
    return c.json({ 
      error: 'Failed to import SSH logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ログの取得（GET /log/）
logs.get('/', authMiddleware, async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    
    const filters = {
      logType: c.req.query('logType'),
      ipAddress: c.req.query('ipAddress'),
      username: c.req.query('username'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate')
    };
    
    const result = await getLogsWithFilters(filters, { page, limit });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching SSH logs:', error);
    return c.json({ error: 'Failed to fetch SSH logs' }, 500);
  }
});

// 全てのSSHログを削除（DELETE /log/）
logs.delete('/', authMiddleware, async (c) => {
  try {
    const result = await deleteAllLogs();
    console.log(`All SSH logs deleted by user: ${c.get('user').email}, count: ${result.deletedCount}`);
    return c.json(result);
  } catch (error) {
    console.error('Error deleting all SSH logs:', error);
    return c.json({ error: '全ログ削除に失敗しました' }, 500);
  }
});

// ログ分析データ取得（GET /log/query）
logs.get('/query', authMiddleware, async (c) => {
  try {
    const timeRange = c.req.query('timeRange') || '7d';
    const queryType = c.req.query('type') || 'analytics';
    
    const result = await getAnalyticsData({ timeRange, queryType });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching SSH log analytics:', error);
    return c.json({ error: 'Failed to fetch analytics data' }, 500);
  }
});

// 指定期間より古いログを削除（DELETE /log/cleanup）
logs.delete('/cleanup', authMiddleware, async (c) => {
  try {
    const daysOld = parseInt(c.req.query('days') || '30');
    const result = await cleanupOldLogs(daysOld);
    console.log(`Old SSH logs deleted by user: ${c.get('user').email}, days: ${daysOld}, count: ${result.deletedCount}`);
    return c.json(result);
  } catch (error) {
    console.error('Error cleaning up old SSH logs:', error);
    return c.json({ error: '古いログの削除に失敗しました' }, 500);
  }
});

// AbuseIPDB API問い合わせ（GET /log/abuseipdb/:ipAddress）
logs.get('/abuseipdb/:ipAddress', authMiddleware, async (c) => {
  try {
    const ipAddress = c.req.param('ipAddress');
    const user = c.get('user');
    
    if (!user.abuseipdbApiKey) {
      return c.json({ 
        error: 'AbuseIPDB APIキーが設定されていません',
        message: 'ユーザー設定でAPIキーを設定してください'
      }, 400);
    }
    
    // AbuseIPDB APIに問い合わせ（公式ドキュメントに準拠）
    const params = new URLSearchParams({
      ipAddress: ipAddress,
      maxAgeInDays: '90'
    });
    
    const response = await fetch(`https://api.abuseipdb.com/api/v2/check?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Key': user.abuseipdbApiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AbuseIPDB API error:', response.status, errorText);
      return c.json({ 
        error: 'AbuseIPDB APIへの問い合わせに失敗しました',
        details: errorText
      }, 500);
    }
    
    const data = await response.json();
    
    return c.json({
      success: true,
      ipAddress: ipAddress,
      data: data.data
    });
    
  } catch (error) {
    console.error('Error querying AbuseIPDB:', error);
    return c.json({ 
      error: 'AbuseIPDB APIへの問い合わせ中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// UFWログ関連のエンドポイント
logs.get('/ufw', authMiddleware, async (c) => {
  try {
    const filters = {
      logType: c.req.query('logType') as string,
      ipAddress: c.req.query('ipAddress') as string,
      protocol: c.req.query('protocol') as string,
      startDate: c.req.query('startDate') as string,
      endDate: c.req.query('endDate') as string
    };

    const pagination = {
      page: parseInt(c.req.query('page') || '1'),
      limit: parseInt(c.req.query('limit') || '50')
    };

    const result = await getUfwLogsWithFilters(filters, pagination);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching UFW logs:', error);
    return c.json({ error: 'Failed to fetch UFW logs' }, 500);
  }
});

logs.get('/ufw/analytics', authMiddleware, async (c) => {
  try {
    const params = {
      timeRange: c.req.query('timeRange') || '7d',
      queryType: c.req.query('queryType') || 'detailed'
    };

    const result = await getUfwAnalyticsData(params);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching UFW analytics:', error);
    return c.json({ error: 'Failed to fetch UFW analytics' }, 500);
  }
});

logs.post('/ufw/import', authMiddleware, async (c) => {
  try {
    const result = await importUfwLogs();
    return c.json(result);
  } catch (error) {
    console.error('Error importing UFW logs:', error);
    return c.json({ error: 'Failed to import UFW logs' }, 500);
  }
});

logs.delete('/ufw/cleanup', authMiddleware, async (c) => {
  try {
    const daysOld = parseInt(c.req.query('days') || '30');
    
    if (!daysOld || daysOld < 1) {
      return c.json({ error: 'Valid daysOld parameter is required' }, 400);
    }

    const result = await cleanupUfwLogs(daysOld);
    console.log(`Old UFW logs deleted by user: ${c.get('user').email}, days: ${daysOld}, count: ${result.deletedCount}`);
    return c.json(result);
  } catch (error) {
    console.error('Error cleaning up UFW logs:', error);
    return c.json({ error: 'Failed to cleanup UFW logs' }, 500);
  }
});

logs.delete('/ufw/all', authMiddleware, async (c) => {
  try {
    const result = await deleteAllUfwLogs();
    console.log(`All UFW logs deleted by user: ${c.get('user').email}, count: ${result.deletedCount}`);
    return c.json(result);
  } catch (error) {
    console.error('Error deleting all UFW logs:', error);
    return c.json({ error: 'Failed to delete all UFW logs' }, 500);
  }
});

export default logs;
