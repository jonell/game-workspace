import { BrowserWindow, screen } from 'electron';

let notificationWindow: BrowserWindow | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

export interface KillNotificationOptions {
  processName: string;
  countdownSeconds?: number;  // default 5
  onKillNow: () => void;      // user clicked "close now" or countdown expired
}

/**
 * Show a blacklist kill notification at the bottom-right corner.
 * Displays a countdown; auto-kills when countdown expires.
 */
export function showKillNotification(opts: KillNotificationOptions): void {
  closeKillNotification();

  const seconds = opts.countdownSeconds ?? 5;
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  const winW = 360;
  const winH = 220;

  notificationWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: screenWidth - winW - 20,
    y: screenHeight - winH - 20,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: "Microsoft YaHei", sans-serif; background: #0F172A; color: #E2E8F0;
           border: 1px solid #FF4757; border-radius: 12px; overflow: hidden;
           user-select: none; -webkit-app-region: drag; height: 100vh;
           display: flex; flex-direction: column; }
    .header { padding: 20px 20px 12px; text-align: center; }
    .title { font-size: 16px; font-weight: 700; color: #FF4757; }
    .process-name { font-size: 14px; color: #FF9100; margin-top: 6px; font-family: monospace; }
    .body { padding: 0 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .countdown-text { text-align: center; font-size: 13px; color: #94A3B8; margin-bottom: 8px; }
    .progress-bar { width: 100%; height: 6px; background: rgba(255,71,87,0.2); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #FF4757, #FF9100);
                     border-radius: 3px; transition: width 1s linear; width: 100%; }
    .timer { text-align: center; font-size: 28px; font-weight: 700; color: #FF4757;
             margin-top: 10px; font-family: monospace; }
    .actions { display: flex; gap: 12px; padding: 16px 20px 20px; -webkit-app-region: no-drag; }
    .btn { flex:1; padding: 10px 0; border-radius: 8px; border: none; cursor: pointer;
           font-size: 14px; font-weight: 600; transition: all 0.2s; }
    .btn-kill { background: linear-gradient(135deg, #FF4757, #FF6B81); color: #fff; }
    .btn-kill:hover { transform: scale(1.02); }
    .btn-close { background: rgba(148,163,184,0.15); color: #94A3B8; }
    .btn-close:hover { background: rgba(148,163,184,0.25); }
  </style></head><body>
    <div class="header">
      <div class="title">⚠️ 检测到黑名单进程</div>
      <div class="process-name">${escHtml(opts.processName)}</div>
    </div>
    <div class="body">
      <div class="countdown-text" id="countdownLabel">将在 5 秒后自动关闭</div>
      <div class="progress-bar"><div class="progress-fill" id="progressBar"></div></div>
      <div class="timer" id="timerDisplay">5</div>
    </div>
    <div class="actions">
      <button class="btn btn-close" id="closeBtn">× 关闭提示</button>
      <button class="btn btn-kill" id="killBtn">⚡ 立即关闭</button>
    </div>
    <script>
      let sec = ${seconds};
      const totalSec = ${seconds};
      const timerDisplay = document.getElementById('timerDisplay');
      const countdownLabel = document.getElementById('countdownLabel');
      const progressBar = document.getElementById('progressBar');

      const countdown = setInterval(() => {
        sec--;
        timerDisplay.textContent = sec;
        countdownLabel.textContent = '将在 ' + sec + ' 秒后自动关闭';
        progressBar.style.width = ((sec / totalSec) * 100) + '%';
        if (sec <= 0) {
          clearInterval(countdown);
          window.__onCountdownExpire && window.__onCountdownExpire();
          window.close();
        }
      }, 1000);

      document.getElementById('killBtn').addEventListener('click', () => {
        clearInterval(countdown);
        window.__onKillNow && window.__onKillNow();
        window.close();
      });

      document.getElementById('closeBtn').addEventListener('click', () => {
        clearInterval(countdown);
        // Still kill even if user dismisses notification
        window.__onKillNow && window.__onKillNow();
        window.close();
      });
    </script>
  </body></html>`;

  notificationWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Inject callbacks
  notificationWindow.webContents.executeJavaScript(
    `window.__onKillNow = function() {}; window.__onCountdownExpire = function() {};`,
  );

  // Wire up the callbacks via IPC
  notificationWindow.webContents.executeJavaScript(`
    window.__onKillNow = function() { window.__killAction = 'now'; };
    window.__onCountdownExpire = function() { window.__killAction = 'expire'; };
  `);

  notificationWindow.on('closed', () => {
    // Check which action triggered the close
    notificationWindow?.webContents.executeJavaScript('window.__killAction || "expire"')
      .then((action: string) => {
        if (action === 'now') {
          opts.onKillNow();
        } else {
          // Countdown expired — still kill
          opts.onKillNow();
        }
        notificationWindow = null;
      })
      .catch(() => {
        // Fallback: always kill on close
        opts.onKillNow();
        notificationWindow = null;
      });
  });

  // Safety: auto-close after countdown + 3 seconds
  autoCloseTimer = setTimeout(() => {
    closeKillNotification();
  }, (seconds + 3) * 1000);
}

function closeKillNotification(): void {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
  if (notificationWindow) {
    try { notificationWindow.close(); } catch { /* ignore */ }
    notificationWindow = null;
  }
}

/** Show a brief toast after process has been killed. */
export function showKilledToast(processName: string): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const winW = 320;
  const winH = 60;

  const toast = new BrowserWindow({
    width: winW,
    height: winH,
    x: screenWidth - winW - 20,
    y: screenHeight - winH - 20,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: "Microsoft YaHei", sans-serif; background: #0F172A; color: #E2E8F0;
           border: 1px solid #00E676; border-radius: 10px; overflow: hidden;
           user-select: none; -webkit-app-region: drag; height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .msg { font-size: 13px; color: #00E676; text-align: center; }
    .name { color: #fff; font-weight: 600; }
  </style></head><body>
    <div class="msg">✅ 已自动关闭黑名单进程 <span class="name">${escHtml(processName)}</span></div>
  </body></html>`;

  toast.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Auto-close after 3 seconds
  setTimeout(() => {
    try { toast.close(); } catch { /* ignore */ }
  }, 3000);
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
