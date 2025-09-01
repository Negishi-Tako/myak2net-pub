import { PrismaClient } from '../generated/prisma/index.js';
import { parseLogLine, parseUfwLogLine } from './logParser.js';
import type { ParsedLogEntry } from './logParser.js';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface ImportResult {
  success: boolean;
  totalLines: number;
  parsedLines: number;
  insertedCount: number;
  skippedLines: number;
  errors: string[];
  progress?: {
    current: number;
    total: number;
    percentage: number;
    stage: 'parsing' | 'inserting' | 'completed';
  };
}

export async function importLogsFromFile(): Promise<ImportResult> {
  const authLogPath = path.join(process.cwd(), '.', 'auth.log');
  
  // ファイルが存在するかチェック
  if (!fs.existsSync(authLogPath)) {
    throw new Error('auth.log file not found');
  }
  
  // ファイルを読み込み
  const logContent = fs.readFileSync(authLogPath, 'utf-8');
  const logLines = logContent.split('\n').filter(line => line.trim() !== '');
  
  const parsedLogs: ParsedLogEntry[] = [];
  const errors: string[] = [];
  
  // 各行を解析（進行度付き）
  console.log(`Starting to parse ${logLines.length} log lines...`);
  for (let i = 0; i < logLines.length; i++) {
    try {
      const parsed = parseLogLine(logLines[i]);
      if (parsed) {
        parsedLogs.push(parsed);
      }
      
      // 進行度をログ出力（100行ごと）
      if ((i + 1) % 100 === 0 || i === logLines.length - 1) {
        const progress = Math.round(((i + 1) / logLines.length) * 100);
        console.log(`Parsing progress: ${progress}% (${i + 1}/${logLines.length})`);
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`Parsing completed. Found ${parsedLogs.length} valid log entries.`);
  
  // 既存のログと重複しないようにチェック（タイムスタンプとメッセージで判定）
  let insertedCount = 0;
  let skippedCount = 0;
  
  console.log('Starting database insertion...');
  for (let i = 0; i < parsedLogs.length; i++) {
    try {
      const logEntry = parsedLogs[i];
      
      // 同じタイムスタンプとメッセージのログが既に存在するかチェック
      const existing = await prisma.sshLog.findFirst({
        where: {
          timestamp: logEntry.timestamp,
          message: logEntry.message
        }
      });
      
      if (!existing) {
        await prisma.sshLog.create({
          data: logEntry
        });
        insertedCount++;
      } else {
        skippedCount++;
      }
      
      // 進行度をログ出力（50件ごと）
      if ((i + 1) % 50 === 0 || i === parsedLogs.length - 1) {
        const progress = Math.round(((i + 1) / parsedLogs.length) * 100);
        console.log(`Insertion progress: ${progress}% (${i + 1}/${parsedLogs.length})`);
      }
    } catch (error) {
      errors.push(`Failed to insert log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`Import completed. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  
  return {
    success: true,
    totalLines: logLines.length,
    parsedLines: parsedLogs.length,
    insertedCount,
    skippedLines: skippedCount,
    errors: errors,
    progress: {
      current: parsedLogs.length,
      total: logLines.length,
      percentage: 100,
      stage: 'completed'
    }
  };
}

export async function importUfwLogs(): Promise<ImportResult> {
  const ufwLogPath = path.join(process.cwd(), '.', 'ufw.log');
  
  // ファイルが存在するかチェック
  if (!fs.existsSync(ufwLogPath)) {
    throw new Error('ufw.log file not found');
  }
  
  // ファイルを読み込み
  const logContent = fs.readFileSync(ufwLogPath, 'utf-8');
  const lines = logContent.split('\n').filter(line => line.trim() !== '');
  
  const parsedLogs: any[] = [];
  const errors: string[] = [];
  
  // 各行を解析（進行度付き）
  console.log(`Starting to parse ${lines.length} UFW log lines...`);
  for (let i = 0; i < lines.length; i++) {
    try {
      const parsed = parseUfwLogLine(lines[i]);
      if (parsed) {
        parsedLogs.push(parsed);
      }
      
      // 進行度をログ出力（100行ごと）
      if ((i + 1) % 100 === 0 || i === lines.length - 1) {
        const progress = Math.round(((i + 1) / lines.length) * 100);
        console.log(`Parsing progress: ${progress}% (${i + 1}/${lines.length})`);
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`Parsing completed. Found ${parsedLogs.length} valid UFW log entries.`);
  
  // 既存のログと重複しないようにチェック（タイムスタンプとメッセージで判定）
  let insertedCount = 0;
  let skippedCount = 0;
  
  console.log('Starting database insertion...');
  for (let i = 0; i < parsedLogs.length; i++) {
    try {
      const logEntry = parsedLogs[i];
      
      // 同じタイムスタンプとメッセージのログが既に存在するかチェック
      const existing = await prisma.ufwLog.findFirst({
        where: {
          timestamp: logEntry.timestamp,
          message: logEntry.message
        }
      });
      
      if (!existing) {
        await prisma.ufwLog.create({
          data: logEntry
        });
        insertedCount++;
      } else {
        skippedCount++;
      }
      
      // 進行度をログ出力（50件ごと）
      if ((i + 1) % 50 === 0 || i === parsedLogs.length - 1) {
        const progress = Math.round(((i + 1) / parsedLogs.length) * 100);
        console.log(`Insertion progress: ${progress}% (${i + 1}/${parsedLogs.length})`);
      }
    } catch (error) {
      errors.push(`Failed to insert log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`Import completed. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  
  return {
    success: true,
    totalLines: lines.length,
    parsedLines: parsedLogs.length,
    insertedCount,
    skippedLines: skippedCount,
    errors: errors,
    progress: {
      current: parsedLogs.length,
      total: lines.length,
      percentage: 100,
      stage: 'completed'
    }
  };
}
