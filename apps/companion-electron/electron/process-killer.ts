import { exec } from 'child_process';
import { ProcessInfo } from './process-monitor';

// ── Rate Limiting ──

const killHistory: number[] = [];  // timestamps of recent kills
const MAX_KILLS_PER_10S = 5;
const KILL_WINDOW_MS = 10_000;

function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove entries older than window
  while (killHistory.length > 0 && killHistory[0] < now - KILL_WINDOW_MS) {
    killHistory.shift();
  }
  return killHistory.length < MAX_KILLS_PER_10S;
}

function recordKill(): void {
  killHistory.push(Date.now());
}

// ── Kill Execution ──

export interface KillResult {
  processName: string;
  pid: number;
  success: boolean;
  resultText: string;
}

/** Kill a process by PID using Windows taskkill. */
export function killProcess(process: ProcessInfo): Promise<KillResult> {
  if (!checkRateLimit()) {
    return Promise.resolve({
      processName: process.name,
      pid: process.pid,
      success: false,
      resultText: 'Rate limited — too many kills in short period',
    });
  }

  return new Promise((resolve) => {
    recordKill();

    // Use PID-based kill for precision (avoids killing wrong process with same name)
    exec(`taskkill /F /PID ${process.pid}`, { timeout: 10000 }, (error, stdout, stderr) => {
      const result: KillResult = {
        processName: process.name,
        pid: process.pid,
        success: !error,
        resultText: error ? (stderr || error.message) : (stdout || 'OK'),
      };

      // Log locally
      logKillToFile(result);

      resolve(result);
    });
  });
}

// ── Local Logging ──

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

function logKillToFile(result: KillResult): void {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, 'process-kill.log');
    const line = `[${new Date().toISOString()}] ${result.success ? 'KILLED' : 'FAILED'} ${result.processName} (PID ${result.pid}) — ${result.resultText}\n`;
    fs.appendFileSync(logPath, line);
  } catch {
    // silently ignore log failures
  }
}
