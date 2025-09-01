import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

export interface DeleteResult {
  success: boolean;
  message: string;
  deletedCount: number;
  previousCount?: number;
  cutoffDate?: Date;
  daysOld?: number;
}

export async function deleteAllLogs(): Promise<DeleteResult> {
  // 削除前にログ数を取得
  const logCount = await prisma.sshLog.count();
  
  if (logCount === 0) {
    return {
      success: true,
      message: 'ログはすでに空です',
      deletedCount: 0
    };
  }
  
  // 全てのログを削除
  const result = await prisma.sshLog.deleteMany({});
  
  return {
    success: true,
    message: `全ての SSH ログ（${result.count}件）が削除されました`,
    deletedCount: result.count,
    previousCount: logCount
  };
}

export async function cleanupOldLogs(daysOld: number): Promise<DeleteResult> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  // 削除対象のログ数を事前に確認
  const targetCount = await prisma.sshLog.count({
    where: {
      timestamp: { lt: cutoffDate }
    }
  });
  
  if (targetCount === 0) {
    return {
      success: true,
      message: `${daysOld}日より古いログはありません`,
      deletedCount: 0,
      cutoffDate,
      daysOld
    };
  }
  
  // 古いログを削除
  const result = await prisma.sshLog.deleteMany({
    where: {
      timestamp: { lt: cutoffDate }
    }
  });
  
  return {
    success: true,
    message: `${daysOld}日より古いログ（${result.count}件）が削除されました`,
    deletedCount: result.count,
    cutoffDate,
    daysOld
  };
}

export interface CleanupResult {
  deletedCount: number;
  success: boolean;
  message: string;
}

export async function cleanupUfwLogs(daysOld: number): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.ufwLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    return {
      deletedCount: result.count,
      success: true,
      message: `Successfully deleted ${result.count} UFW logs older than ${daysOld} days.`
    };
  } catch (error) {
    return {
      deletedCount: 0,
      success: false,
      message: `Failed to cleanup UFW logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function deleteAllUfwLogs(): Promise<CleanupResult> {
  try {
    const result = await prisma.ufwLog.deleteMany({});

    return {
      deletedCount: result.count,
      success: true,
      message: `Successfully deleted all ${result.count} UFW logs.`
    };
  } catch (error) {
    return {
      deletedCount: 0,
      success: false,
      message: `Failed to delete all UFW logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
