// Unified notification window utility — shared by blacklist + remote-command
import { BrowserWindow, screen } from 'electron';

export interface NotificationConfig {
  width?: number; height?: number;
  borderColor: string;
  title: string;
  subtitle?: string;
  processName?: string;
  countdownSeconds: number;
  bodyHtml: string;
  onExecute: () => void;
  onCancel?: () => void;
  contextIsolation?: boolean;
}

export function showNotificationWindow(opts: NotificationConfig): BrowserWindow {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const w = opts.width || 360, h = opts.height || 200;

  const win = new BrowserWindow({
    width: w, height: h, x: sw - w - 20, y: sh - h - 20,
    frame: false, alwaysOnTop: true, skipTaskbar: true, resizable: false,
    transparent: true, backgroundColor: '#00000000',
    webPreferences: { contextIsolation: false, nodeIntegration: true },
  });

  const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei",sans-serif;background:#0F172A;color:#E2E8F0;
border:1px solid ${opts.borderColor};border-radius:12px;overflow:hidden;
user-select:none;-webkit-app-region:drag;height:100vh;display:flex;flex-direction:column}
.h{padding:20px 20px 12px;text-align:center}
.t{font-size:16px;font-weight:700;color:${opts.borderColor}}
.s{font-size:13px;color:#94A3B8;margin-top:6px}
.n{font-size:14px;color:#FF9100;margin-top:6px;font-family:monospace}
.b{flex:1;display:flex;flex-direction:column;justify-content:center}
.c{text-align:center;font-size:13px;color:#94A3B8}
.a{display:flex;gap:12px;padding:16px 20px 20px;-webkit-app-region:no-drag}
.bt{flex:1;padding:10px 0;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600}
.be{background:linear-gradient(135deg,${opts.borderColor},#FF6B00);color:#fff}
.bc{background:rgba(148,163,184,0.15);color:#94A3B8}
</style></head><body>
<div class="h"><div class="t">${opts.title}</div>${opts.processName ? `<div class="n">${opts.processName}</div>` : ''}${opts.subtitle ? `<div class="s">${opts.subtitle}</div>` : ''}</div>
<div class="b">${opts.bodyHtml}</div>
<div class="a"><button class="bt bc" id="cb">取消</button><button class="bt be" id="eb">执行</button></div>
<script>const{ipcRenderer}=require('electron');
let s=${opts.countdownSeconds};
const cd=setInterval(()=>{s--;document.getElementById('td').textContent=s;if(s<=0){clearInterval(cd);ipcRenderer.send('ntf-exec');window.close();}},1000);
document.getElementById('eb').addEventListener('click',()=>{clearInterval(cd);ipcRenderer.send('ntf-exec');window.close();});
document.getElementById('cb').addEventListener('click',()=>{clearInterval(cd);ipcRenderer.send('ntf-cancel');window.close();});
</script></body></html>`;

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(content));
  return win;
}
