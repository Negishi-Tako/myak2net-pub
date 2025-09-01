import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

export interface LogFilters {
  logType?: string;
  ipAddress?: string;
  username?: string;
  startDate?: string;
  endDate?: string;
}

export interface UfwLogFilters {
  logType?: string;
  ipAddress?: string;
  protocol?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface LogQueryResult {
  logs: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: LogFilters;
}

export interface UfwLogQueryResult {
  logs: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: UfwLogFilters;
}

export async function getLogsWithFilters(
  filters: LogFilters,
  pagination: PaginationParams
): Promise<LogQueryResult> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;
  
  // WHERE条件を構築
  const where: any = {};
  
  if (filters.logType) {
    where.logType = filters.logType;
  }
  
  if (filters.ipAddress) {
    where.ipAddress = { contains: filters.ipAddress };
  }
  
  if (filters.username) {
    where.username = { contains: filters.username };
  }
  
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) {
      where.timestamp.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.timestamp.lte = new Date(filters.endDate);
    }
  }
  
  const [logs, total] = await Promise.all([
    prisma.sshLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.sshLog.count({ where })
  ]);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    filters
  };
}

export async function getUfwLogsWithFilters(
  filters: UfwLogFilters,
  pagination: PaginationParams
): Promise<UfwLogQueryResult> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;
  
  // WHERE条件を構築
  const where: any = {};
  
  if (filters.logType) {
    where.logType = filters.logType;
  }
  
  if (filters.ipAddress) {
    where.ipAddress = { contains: filters.ipAddress };
  }
  
  if (filters.protocol) {
    where.protocol = { contains: filters.protocol };
  }
  
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) {
      where.timestamp.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.timestamp.lte = new Date(filters.endDate);
    }
  }
  
  const [logs, total] = await Promise.all([
    prisma.ufwLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.ufwLog.count({ where })
  ]);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    filters
  };
}
