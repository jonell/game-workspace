// Built-in system whitelist — processes that are never killed
// These are auto-seeded into ProcessWhitelist on first access
export const BUILTIN_WHITELIST: string[] = [
  'WeChat.exe',              // WeChat desktop
  'WeChatApp.exe',           // WeChat sub-process
  'WeChatPlayer.exe',        // WeChat media player
  'WeChatBrowser.exe',       // WeChat embedded browser
  'explorer.exe',            // Windows Explorer
  'taskmgr.exe',             // Task Manager
  'chrome.exe',              // Google Chrome
  'msedge.exe',              // Microsoft Edge
  'firefox.exe',             // Firefox
  'Code.exe',                // VS Code
  'notepad.exe',             // Notepad
  'cmd.exe',                 // Command Prompt
  'powershell.exe',          // PowerShell
  'SystemSettings.exe',      // Windows Settings
  'ApplicationFrameHost.exe',// UWP app frame host
  'sihost.exe',              // Shell Infrastructure Host
  'taskhostw.exe',           // Task Host Window
  'ctfmon.exe',              // CTF Loader (input method)
  'conhost.exe',             // Console Window Host
  'RuntimeBroker.exe',       // UWP Runtime Broker
  'TextInputHost.exe',       // Windows Text Input
  'SearchApp.exe',           // Windows Search
  'StartMenuExperienceHost.exe', // Start Menu
  'SecurityHealthSystray.exe',   // Windows Security tray
  'SecurityHealthService.exe',   // Windows Security service
];
