import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

export interface AnalyticsParams {
  timeRange: string;
  queryType: string;
}

export interface AnalyticsResult {
  timeRange: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  queryType: string;
  logTypeStats: Array<{
    logType: string;
    count: number;
  }>;
  dailyStats: any[];
  topIpAddresses: Array<{
    ipAddress: string | null;
    count: number;
  }>;
  userStats: Array<{
    username: string | null;
    count: number;
  }>;
  hourlyStats: any[];
  actionStats: Array<{
    action: string;
    count: number;
  }>;
}

export interface UfwAnalyticsResult {
  timeRange: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  queryType: string;
  logTypeStats: Array<{
    logType: string;
    count: number;
  }>;
  dailyStats: any[];
  topIpAddresses: Array<{
    ipAddress: string | null;
    count: number;
  }>;
  protocolStats: Array<{
    protocol: string | null;
    count: number;
  }>;
  hourlyStats: any[];
  actionStats: Array<{
    action: string;
    count: number;
  }>;
  portStats: Array<{
    port: number | null;
    count: number;
  }>;
}

// BigIntを数値に変換する関数
function convertBigIntToNumber(obj: any): any {
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  if (obj !== null && typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertBigIntToNumber(obj[key]);
    }
    return converted;
  }
  return obj;
}

export async function getAnalyticsData(params: AnalyticsParams): Promise<AnalyticsResult> {
  const { timeRange, queryType } = params;
  
  // 期間の計算
  const now = new Date();
  let startDate: Date;
  switch (timeRange) {
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  // クエリタイプに応じて異なる分析データを返す
  if (queryType === 'summary') {
    // 基本的な統計のみ
    const logTypeStats = await prisma.sshLog.groupBy({
      by: ['logType'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true }
    });
    
    return {
      timeRange,
      period: { startDate, endDate: now },
      queryType,
      logTypeStats: logTypeStats.map(stat => ({
        logType: stat.logType,
        count: Number(stat._count.id)
      })),
      dailyStats: [],
      topIpAddresses: [],
      userStats: [],
      hourlyStats: [],
      actionStats: []
    };
  }
  
  // 詳細な分析データ（デフォルト）
  const [logTypeStats, dailyStats, topIpAddresses, userStats, hourlyStats, actionStats] = await Promise.all([
    // ログタイプ別の統計
    prisma.sshLog.groupBy({
      by: ['logType'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true }
    }),
    
    // 日別の統計
    prisma.$queryRaw`
      SELECT 
        DATE(timestamp) as date,
        logType,
        COUNT(*) as count
      FROM SshLog 
      WHERE timestamp >= ${startDate}
      GROUP BY DATE(timestamp), logType
      ORDER BY date ASC
    `,
    
    // IPアドレス別のトップ統計
    prisma.sshLog.groupBy({
      by: ['ipAddress'],
      where: {
        timestamp: { gte: startDate },
        ipAddress: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    
    // ユーザー別の統計
    prisma.sshLog.groupBy({
      by: ['username'],
      where: {
        timestamp: { gte: startDate },
        username: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    
    // 時間別の統計（24時間）
    prisma.$queryRaw`
      SELECT 
        HOUR(timestamp) as hour,
        COUNT(*) as count
      FROM SshLog 
      WHERE timestamp >= ${startDate}
      GROUP BY HOUR(timestamp)
      ORDER BY hour ASC
    `,
    
    // アクション別の統計
    prisma.sshLog.groupBy({
      by: ['action'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15
    })
  ]);

  return {
    timeRange,
    period: { startDate, endDate: now },
    queryType,
    logTypeStats: logTypeStats.map(stat => ({
      logType: stat.logType,
      count: Number(stat._count.id)
    })),
    dailyStats: convertBigIntToNumber(dailyStats),
    topIpAddresses: topIpAddresses.map(stat => ({
      ipAddress: stat.ipAddress,
      count: Number(stat._count.id)
    })),
    userStats: userStats.map(stat => ({
      username: stat.username,
      count: Number(stat._count.id)
    })),
    hourlyStats: convertBigIntToNumber(hourlyStats),
    actionStats: actionStats.map(stat => ({
      action: stat.action,
      count: Number(stat._count.id)
    }))
  };
}

export async function getUfwAnalyticsData(params: AnalyticsParams): Promise<UfwAnalyticsResult> {
  const { timeRange, queryType } = params;
  
  // 期間の計算
  const now = new Date();
  let startDate: Date;
  switch (timeRange) {
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  // クエリタイプに応じて異なる分析データを返す
  if (queryType === 'summary') {
    // 基本的な統計のみ
    const logTypeStats = await prisma.ufwLog.groupBy({
      by: ['logType'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true }
    });
    
    return {
      timeRange,
      period: { startDate, endDate: now },
      queryType,
      logTypeStats: logTypeStats.map(stat => ({
        logType: stat.logType,
        count: Number(stat._count.id)
      })),
      dailyStats: [],
      topIpAddresses: [],
      protocolStats: [],
      hourlyStats: [],
      actionStats: [],
      portStats: []
    };
  }
  
  // 詳細な分析データ（デフォルト）
  const [logTypeStats, dailyStats, topIpAddresses, protocolStats, hourlyStats, actionStats, portStats] = await Promise.all([
    // ログタイプ別の統計
    prisma.ufwLog.groupBy({
      by: ['logType'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true }
    }),
    
    // 日別の統計
    prisma.$queryRaw`
      SELECT 
        DATE(timestamp) as date,
        logType,
        COUNT(*) as count
      FROM UfwLog 
      WHERE timestamp >= ${startDate}
      GROUP BY DATE(timestamp), logType
      ORDER BY date ASC
    `,
    
    // IPアドレス別のトップ統計
    prisma.ufwLog.groupBy({
      by: ['ipAddress'],
      where: {
        timestamp: { gte: startDate },
        ipAddress: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    
    // プロトコル別の統計
    prisma.ufwLog.groupBy({
      by: ['protocol'],
      where: {
        timestamp: { gte: startDate },
        protocol: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    
    // 時間別の統計（24時間）
    prisma.$queryRaw`
      SELECT 
        HOUR(timestamp) as hour,
        COUNT(*) as count
      FROM UfwLog 
      WHERE timestamp >= ${startDate}
      GROUP BY HOUR(timestamp)
      ORDER BY hour ASC
    `,
    
    // アクション別の統計
    prisma.ufwLog.groupBy({
      by: ['action'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15
    }),
    
    // ポート別の統計
    prisma.ufwLog.groupBy({
      by: ['port'],
      where: {
        timestamp: { gte: startDate },
        port: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })
  ]);

  return {
    timeRange,
    period: { startDate, endDate: now },
    queryType,
    logTypeStats: logTypeStats.map(stat => ({
      logType: stat.logType,
      count: Number(stat._count.id)
    })),
    dailyStats: convertBigIntToNumber(dailyStats),
    topIpAddresses: topIpAddresses.map(stat => ({
      ipAddress: stat.ipAddress,
      count: Number(stat._count.id)
    })),
    protocolStats: protocolStats.map(stat => ({
      protocol: stat.protocol,
      count: Number(stat._count.id)
    })),
    hourlyStats: convertBigIntToNumber(hourlyStats),
    actionStats: actionStats.map(stat => ({
      action: stat.action,
      count: Number(stat._count.id)
    })),
    portStats: portStats.map(stat => ({
      port: stat.port,
      count: Number(stat._count.id)
    }))
  };
}
