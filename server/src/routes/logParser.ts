import { LogType, UfwLogType } from '../generated/prisma/index.js';

// SSH ログの解析関数
export interface ParsedLogEntry {
  timestamp: Date;
  hostname: string;
  service: string;
  pid?: number;
  username?: string;
  ipAddress?: string;
  port?: number;
  action: string;
  message: string;
  logType: LogType;
}

// UFW ログの解析関数
export interface ParsedUfwLogEntry {
  timestamp: Date;
  hostname: string;
  service: string;
  pid?: number;
  ipAddress?: string;
  port?: number;
  protocol?: string;
  action: string;
  message: string;
  logType: UfwLogType;
}

export function parseLogLine(line: string): ParsedLogEntry | null {
  // ログ形式: 2025-08-24T22:50:09.565995+00:00 ip-10-0-31-10 sshd[7130]: Disconnected from authenticating user root 43.135.150.152 port 48534 [preauth]
  const logRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2})\s+(\S+)\s+(\w+)\[(\d+)\]:\s+(.+)$/;
  const match = line.match(logRegex);
  
  if (!match) return null;
  
  const [, timestampStr, hostname, service, pidStr, message] = match;
  const timestamp = new Date(timestampStr);
  const pid = parseInt(pidStr, 10);
  
  let username: string | undefined;
  let ipAddress: string | undefined;
  let port: number | undefined;
  let action: string = '';
  let logType: LogType = LogType.OTHER;
  
  // SSH関連のログを解析
  if (service === 'sshd') {
    if (message.includes('Connection closed by authenticating user') || message.includes('Connection reset by')) {
      // ログイン遮断の検出
      const blockedMatch = message.match(/Connection (?:closed|reset) by (?:authenticating user )?(\S+) (\S+) port (\d+)/);
      if (blockedMatch) {
        username = blockedMatch[1] !== 'authenticating' ? blockedMatch[1] : undefined;
        ipAddress = blockedMatch[2];
        port = parseInt(blockedMatch[3], 10);
        action = 'Login blocked';
        logType = LogType.SSH_LOGIN_BLOCKED;
      }
    } else if (message.includes('Disconnected from authenticating user')) {
      const disconnectMatch = message.match(/Disconnected from authenticating user (\S+) (\S+) port (\d+)/);
      if (disconnectMatch) {
        username = disconnectMatch[1];
        ipAddress = disconnectMatch[2];
        port = parseInt(disconnectMatch[3], 10);
        action = 'Disconnected from authenticating user';
        logType = LogType.SSH_DISCONNECT;
      }
    } else if (message.includes('Received disconnect from')) {
      const disconnectMatch = message.match(/Received disconnect from (\S+) port (\d+)/);
      if (disconnectMatch) {
        ipAddress = disconnectMatch[1];
        port = parseInt(disconnectMatch[2], 10);
        action = 'Received disconnect';
        logType = LogType.SSH_DISCONNECT;
      }
    } else if (message.includes('Connection from') && message.includes('on unused port')) {
      // 不正接続試行の検出
      const blockedMatch = message.match(/Connection from (\S+) port (\d+)/);
      if (blockedMatch) {
        ipAddress = blockedMatch[1];
        port = parseInt(blockedMatch[2], 10);
        action = 'Connection attempt blocked';
        logType = LogType.SSH_LOGIN_BLOCKED;
      }
    } else if (message.includes('Accepted')) {
      const acceptMatch = message.match(/Accepted \w+ for (\S+) from (\S+) port (\d+)/);
      if (acceptMatch) {
        username = acceptMatch[1];
        ipAddress = acceptMatch[2];
        port = parseInt(acceptMatch[3], 10);
        action = 'SSH connection accepted';
        logType = LogType.SSH_AUTH_SUCCESS;
      }
    } else if (message.includes('Failed password') || message.includes('Invalid user')) {
      const failMatch = message.match(/(?:Failed password|Invalid user) (?:for )?(\S+) from (\S+) port (\d+)/);
      if (failMatch) {
        username = failMatch[1];
        ipAddress = failMatch[2];
        port = parseInt(failMatch[3], 10);
        action = message.includes('Invalid user') ? 'Invalid user login attempt' : 'Authentication failed';
        logType = LogType.SSH_AUTH_FAIL;
      }
    } else if (message.includes('Connection established')) {
      const connectMatch = message.match(/Connection established from (\S+) port (\d+)/);
      if (connectMatch) {
        ipAddress = connectMatch[1];
        port = parseInt(connectMatch[2], 10);
        action = 'SSH connection established';
        logType = LogType.SSH_CONNECT;
      }
    } else if (message.includes('Disconnected from invalid user')) {
      const blockedMatch = message.match(/Disconnected from invalid user (\S+) (\S+) port (\d+)/);
      if (blockedMatch) {
        username = blockedMatch[1] !== 'invalid' ? blockedMatch[1] : undefined;
        ipAddress = blockedMatch[2];
        port = parseInt(blockedMatch[3], 10);
        action = 'Disconnected from invalid user';
        logType = LogType.SSH_DISCONNECT;
      }
    }
  } else if (service === 'CRON') {
    if (message.includes('session opened') || message.includes('session closed')) {
      const sessionMatch = message.match(/session (opened|closed) for user (\S+)/);
      if (sessionMatch) {
        action = `CRON session ${sessionMatch[1]}`;
        username = sessionMatch[2];
        logType = LogType.CRON_SESSION;
      }
    }
  }
  
  // その他の場合でもIPアドレス、ユーザー名、ポート番号を抽出
  // まずIPアドレスを抽出（他の抽出処理で参照する可能性があるため最初に実行）
  if (!ipAddress) {
    // IPv4アドレスの正規表現（RFC 5321準拠の範囲チェック付き）
    const ipPattern = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;
    const ipMatch = message.match(ipPattern);
    if (ipMatch) {
      ipAddress = ipMatch[0];
    }
  }
  
  // ユーザー名の抽出を試行（その他の場合）
  if (!username) {
    const userPatterns = [
      /user\s+(\w+)/i,                    // "user root"
      /for\s+(\w+)\s+from/i,             // "for admin from"
      /session.*for\s+(\w+)/i,           // "session opened for user1"
      /\b(\w+)@/,                        // "root@hostname"
      /login.*?(\w+)/i                   // "login attempt user1"
    ];
    
    for (const pattern of userPatterns) {
      const userMatch = message.match(pattern);
      if (userMatch && userMatch[1]) {
        // システムユーザーや一般的でないパターンを除外
        const foundUser = userMatch[1];
        if (foundUser.length >= 2 && foundUser.length <= 32 && 
            !/^(session|opened|closed|for|from|port|ssh|sshd|cron)$/i.test(foundUser)) {
          username = foundUser;
          break;
        }
      }
    }
  }
  
  // ポート番号の抽出を試行（様々なパターンに対応）
  if (!port) {
    const portPatterns = [
      /port\s+(\d+)/i,                    // "port 22"
      /:\s*(\d+)\b/,                      // ":22" or ": 22"
      /\bport:?\s*(\d+)/i,               // "port:22" or "port: 22"
      /from\s+[\d.]+\s+(\d+)/,           // "from 192.168.1.1 22"
      /to\s+[\d.]+\s+(\d+)/              // "to 192.168.1.1 22"
    ];
    
    for (const pattern of portPatterns) {
      const portMatch = message.match(pattern);
      if (portMatch) {
        const portNum = parseInt(portMatch[1], 10);
        // 有効なポート番号かチェック（1-65535）
        if (portNum >= 1 && portNum <= 65535) {
          port = portNum;
          break;
        }
      }
    }
  }
  
  if (!action) {
    action = message.split(' ').slice(0, 3).join(' '); // 最初の3単語をactionとする
  }
  
  // デバッグ用ログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && (username || ipAddress || port)) {
    console.log(`Extracted - User: ${username || 'N/A'}, IP: ${ipAddress || 'N/A'}, Port: ${port || 'N/A'}, Action: ${action}`);
  }
  
  return {
    timestamp,
    hostname,
    service,
    pid,
    username: username || undefined,      // 空文字列の場合はundefinedに
    ipAddress: ipAddress || undefined,    // 空文字列の場合はundefinedに
    port: port || undefined,              // 0の場合はundefinedに
    action,
    message,
    logType
  };
}

export function parseUfwLogLine(line: string): ParsedUfwLogEntry | null {
  // UFWログ形式: 2025-08-24T22:50:09.565995+00:00 ip-10-0-31-10 kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=192.168.1.100 DST=10.0.31.10 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=12345 PROTO=TCP SPT=12345 DPT=22 WINDOW=29200 RES=0x00 SYN URGP=0
  const logRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2})\s+(\S+)\s+(\w+):\s+(.+)$/;
  const match = line.match(logRegex);
  
  if (!match) return null;
  
  const [, timestampStr, hostname, service, message] = match;
  const timestamp = new Date(timestampStr);
  
  let ipAddress: string | undefined;
  let port: number | undefined;
  let protocol: string | undefined;
  let action: string = '';
  let logType: UfwLogType = UfwLogType.OTHER;
  
  // UFWブロックログの解析
  if (message.includes('[UFW BLOCK]')) {
    action = 'UFW BLOCK';
    logType = UfwLogType.UFW_BLOCK;
    
    // SRC（送信元IP）の抽出
    const srcMatch = message.match(/SRC=(\S+)/);
    if (srcMatch) {
      ipAddress = srcMatch[1];
    }
    
    // DPT（宛先ポート）の抽出
    const dptMatch = message.match(/DPT=(\d+)/);
    if (dptMatch) {
      port = parseInt(dptMatch[1], 10);
    }
    
    // PROTO（プロトコル）の抽出
    const protoMatch = message.match(/PROTO=(\S+)/);
    if (protoMatch) {
      protocol = protoMatch[1];
    }
  }
  // UFW DROPログの解析
  else if (message.includes('[UFW DROP]')) {
    action = 'UFW DROP';
    logType = UfwLogType.UFW_DROP;
    
    const srcMatch = message.match(/SRC=(\S+)/);
    if (srcMatch) {
      ipAddress = srcMatch[1];
    }
    
    const dptMatch = message.match(/DPT=(\d+)/);
    if (dptMatch) {
      port = parseInt(dptMatch[1], 10);
    }
    
    const protoMatch = message.match(/PROTO=(\S+)/);
    if (protoMatch) {
      protocol = protoMatch[1];
    }
  }
  // UFW ACCEPTログの解析
  else if (message.includes('[UFW ACCEPT]')) {
    action = 'UFW ACCEPT';
    logType = UfwLogType.UFW_ACCEPT;
    
    const srcMatch = message.match(/SRC=(\S+)/);
    if (srcMatch) {
      ipAddress = srcMatch[1];
    }
    
    const dptMatch = message.match(/DPT=(\d+)/);
    if (dptMatch) {
      port = parseInt(dptMatch[1], 10);
    }
    
    const protoMatch = message.match(/PROTO=(\S+)/);
    if (protoMatch) {
      protocol = protoMatch[1];
    }
  }
  // UFW REJECTログの解析
  else if (message.includes('[UFW REJECT]')) {
    action = 'UFW REJECT';
    logType = UfwLogType.UFW_REJECT;
    
    const srcMatch = message.match(/SRC=(\S+)/);
    if (srcMatch) {
      ipAddress = srcMatch[1];
    }
    
    const dptMatch = message.match(/DPT=(\d+)/);
    if (dptMatch) {
      port = parseInt(dptMatch[1], 10);
    }
    
    const protoMatch = message.match(/PROTO=(\S+)/);
    if (protoMatch) {
      protocol = protoMatch[1];
    }
  }
  // UFW LIMITログの解析
  else if (message.includes('[UFW LIMIT]')) {
    action = 'UFW LIMIT';
    logType = UfwLogType.UFW_LIMIT;
    
    const srcMatch = message.match(/SRC=(\S+)/);
    if (srcMatch) {
      ipAddress = srcMatch[1];
    }
    
    const dptMatch = message.match(/DPT=(\d+)/);
    if (dptMatch) {
      port = parseInt(dptMatch[1], 10);
    }
    
    const protoMatch = message.match(/PROTO=(\S+)/);
    if (protoMatch) {
      protocol = protoMatch[1];
    }
  }
  // その他のUFWログ
  else if (message.includes('UFW')) {
    action = 'UFW LOG';
    logType = UfwLogType.UFW_LOG;
    
    // IPアドレスの抽出を試行
    const ipPattern = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;
    const ipMatch = message.match(ipPattern);
    if (ipMatch) {
      ipAddress = ipMatch[0];
    }
    
    // ポート番号の抽出を試行
    const portPatterns = [
      /port\s+(\d+)/i,
      /:\s*(\d+)\b/,
      /\bport:?\s*(\d+)/i
    ];
    
    for (const pattern of portPatterns) {
      const portMatch = message.match(pattern);
      if (portMatch) {
        const portNum = parseInt(portMatch[1], 10);
        if (portNum >= 1 && portNum <= 65535) {
          port = portNum;
          break;
        }
      }
    }
    
    // プロトコルの抽出を試行
    const protoPatterns = [
      /TCP/i,
      /UDP/i,
      /ICMP/i
    ];
    
    for (const pattern of protoPatterns) {
      const protoMatch = message.match(pattern);
      if (protoMatch) {
        protocol = protoMatch[0].toUpperCase();
        break;
      }
    }
  }
  
  if (!action) {
    action = message.split(' ').slice(0, 3).join(' '); // 最初の3単語をactionとする
  }
  
  // デバッグ用ログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && (ipAddress || port || protocol)) {
    console.log(`UFW Extracted - IP: ${ipAddress || 'N/A'}, Port: ${port || 'N/A'}, Protocol: ${protocol || 'N/A'}, Action: ${action}`);
  }
  
  return {
    timestamp,
    hostname,
    service,
    ipAddress: ipAddress || undefined,
    port: port || undefined,
    protocol: protocol || undefined,
    action,
    message,
    logType
  };
}
