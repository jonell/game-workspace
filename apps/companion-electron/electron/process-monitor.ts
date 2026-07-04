import { exec } from 'child_process';

// ── Types ──

export interface ProcessInfo {
  name: string;      // e.g. "LOL.exe"
  pid: number;
  path?: string;     // full executable path from PowerShell
  memoryMB: number;
}

export interface BlacklistEntry {
  processName: string;
  processPath?: string | null;
}

export interface WhitelistEntry {
  processName: string;
  isSystem: boolean;
}

// ── OS Process Patterns (Windows) ──

const OS_PROCESS_PATTERNS = [
  /^System$/i,
  /^System Idle Process$/i,
  /^services\.exe$/i,
  /^svchost\.exe$/i,
  /^lsass\.exe$/i,
  /^csrss\.exe$/i,
  /^winlogon\.exe$/i,
  /^smss\.exe$/i,
  /^spoolsv\.exe$/i,
  /^wininit\.exe$/i,
  /^dwm\.exe$/i,
  /^fontdrvhost\.exe$/i,
  /^RuntimeBroker\.exe$/i,
  /^ShellExperienceHost\.exe$/i,
  /^SearchIndexer\.exe$/i,
  /^WmiPrvSE\.exe$/i,
  /^sihost\.exe$/i,
  /^taskhostw\.exe$/i,
  /^ctfmon\.exe$/i,
  /^conhost\.exe$/i,
  /^dllhost\.exe$/i,
  /^ApplicationFrameHost\.exe$/i,
  /^TextInputHost\.exe$/i,
  /^SearchApp\.exe$/i,
  /^StartMenuExperienceHost\.exe$/i,
  /^SecurityHealthSystray\.exe$/i,
  /^SecurityHealthService\.exe$/i,
  /^NisSrv\.exe$/i,
  /^MsMpEng\.exe$/i,
  /^MemCompression$/i,
  /^Registry$/i,
  /^Vmmem$/i,
  /^vmcompute\.exe$/i,
  /^Vmwp\.exe$/i,
];

// ── State ──

let localBlacklist: BlacklistEntry[] = [];
let localWhitelist: processName[] = [];
let blacklistVersion = 0;
let reportInterval: ReturnType<typeof setInterval> | null = null;
let recheckInterval: ReturnType<typeof setInterval> | null = null;

type ReportCallback = (processes: ProcessInfo[], totalCount: number) => void;
type KillCallback = (process: ProcessInfo) => void;

let onReportCallback: ReportCallback | null = null;
let onKillCallback: KillCallback | null = null;

// ── Process Collection ──

/** Collect running processes using PowerShell (structured JSON output, fast). */
export function collectProcesses(): Promise<ProcessInfo[]> {
  return new Promise((resolve) => {
    const psCmd = `powershell -NoProfile -Command "Get-Process | Select-Object Name,Id,Path,@{N='MemoryMB';E={[math]::Round(\$_.WorkingSet64/1MB,2)}} | ConvertTo-Json"`;
    exec(psCmd, { timeout: 15000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        // Fallback: try tasklist
        exec('tasklist /FO CSV /NH', { timeout: 10000 }, (err2, out2) => {
          if (err2) { resolve([]); return; }
          resolve(parseTasklist(out2));
        });
        return;
      }
      try {
        const raw = JSON.parse(stdout);
        const list = Array.isArray(raw) ? raw : [raw];
        resolve(list
          .filter((p: any) => p && p.Name)
          .map((p: any) => ({
            name: p.Name,
            pid: p.Id,
            path: p.Path || undefined,
            memoryMB: p.MemoryMB || 0,
          })),
        );
      } catch {
        resolve([]);
      }
    });
  });
}

/** Fallback parser for tasklist CSV output. */
function parseTasklist(output: string): ProcessInfo[] {
  const lines = output.split('\n').filter((l) => l.trim());
  const processes: ProcessInfo[] = [];
  for (const line of lines) {
    // Format: "ImageName","PID","SessionName","Session#","MemUsage"
    const match = line.match(/"([^"]+)","(\d+)","[^"]*","\d+","([^"]+)"/);
    if (match) {
      processes.push({
        name: match[1],
        pid: parseInt(match[2], 10),
        memoryMB: parseMemToMB(match[3]),
      });
    }
  }
  return processes;
}

function parseMemToMB(mem: string): number {
  const num = parseFloat(mem.replace(/[^\d.]/g, ''));
  if (mem.toLowerCase().includes('k')) return num / 1024;
  return num;
}

// ── Filtering ──

/** Remove OS-level system processes. */
export function filterOSProcesses(processes: ProcessInfo[]): ProcessInfo[] {
  return processes.filter((p) => !OS_PROCESS_PATTERNS.some((pattern) => pattern.test(p.name)));
}

// ── Blacklist Matching ──

/** Find processes that match the blacklist but NOT the whitelist (whitelist priority). */
export function findBlacklisted(
  running: ProcessInfo[],
  blacklist: BlacklistEntry[],
  whitelist: string[],
): ProcessInfo[] {
  const whitelistLower = whitelist.map((w) => w.toLowerCase());
  return running.filter((p) => {
    if (whitelistLower.includes(p.name.toLowerCase())) return false;
    return blacklist.some(
      (b) => p.name.toLowerCase() === b.processName.toLowerCase(),
    );
  });
}

// ── Monitor Lifecycle ──

/** Start periodic process monitoring (5 min report + 30s recheck). */
export function startProcessMonitor(
  onReport: ReportCallback,
  onKill: KillCallback,
): void {
  onReportCallback = onReport;
  onKillCallback = onKill;

  // Initial collection
  runReportCycle();

  // Report every 5 minutes
  reportInterval = setInterval(runReportCycle, 5 * 60 * 1000);

  // Re-check against blacklist every 30 seconds
  recheckInterval = setInterval(runBlacklistCheck, 30 * 1000);
}

/** Stop periodic monitoring. */
export function stopProcessMonitor(): void {
  if (reportInterval) { clearInterval(reportInterval); reportInterval = null; }
  if (recheckInterval) { clearInterval(recheckInterval); recheckInterval = null; }
}

// ── Internal Cycles ──

async function runReportCycle(): Promise<void> {
  try {
    const all = await collectProcesses();
    const filtered = filterOSProcesses(all);
    onReportCallback?.(filtered, filtered.length);

    // Also check blacklist after every report
    const hits = findBlacklisted(filtered, localBlacklist, localWhitelist);
    for (const hit of hits) {
      onKillCallback?.(hit);
    }
  } catch {
    // silently ignore transient errors
  }
}

async function runBlacklistCheck(): Promise<void> {
  if (localBlacklist.length === 0) return;
  try {
    const all = await collectProcesses();
    const filtered = filterOSProcesses(all);
    const hits = findBlacklisted(filtered, localBlacklist, localWhitelist);
    for (const hit of hits) {
      onKillCallback?.(hit);
    }
  } catch {
    // silently ignore
  }
}

// ── Blacklist Update ──

/** Update local blacklist from server push. Returns true if version is newer. */
export function updateBlacklist(
  blacklist: BlacklistEntry[],
  whitelist: { processName: string }[],
  version: number,
): boolean {
  if (version <= blacklistVersion) return false;
  localBlacklist = blacklist;
  localWhitelist = whitelist.map((w) => w.processName);
  blacklistVersion = version;

  // Trigger immediate re-check
  runBlacklistCheck();

  return true;
}

export function getBlacklistVersion(): number {
  return blacklistVersion;
}
