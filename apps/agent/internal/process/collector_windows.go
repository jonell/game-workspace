package process

import (
	"os/exec"
	"strconv"
	"strings"
)

type ProcessInfo struct {
	Name string `json:"name"`
	PID  int    `json:"pid"`
	MemKB int  `json:"-"`
}

// Windows process patterns to exclude
var osPatterns = []string{
	"System", "System Idle Process", "services.exe", "svchost.exe",
	"lsass.exe", "csrss.exe", "winlogon.exe", "smss.exe", "spoolsv.exe",
	"wininit.exe", "dwm.exe", "fontdrvhost.exe", "RuntimeBroker.exe",
	"ShellExperienceHost.exe", "SearchIndexer.exe", "WmiPrvSE.exe",
	"sihost.exe", "taskhostw.exe", "ctfmon.exe", "conhost.exe",
	"dllhost.exe", "ApplicationFrameHost.exe", "TextInputHost.exe",
	"SearchApp.exe", "StartMenuExperienceHost.exe",
	"SecurityHealthSystray.exe", "SecurityHealthService.exe",
	"NisSrv.exe", "MsMpEng.exe", "MemCompression", "Registry",
	"Vmmem", "vmcompute.exe", "Vmwp.exe",
}

func CollectProcesses() ([]ProcessInfo, error) {
	out, err := exec.Command("tasklist", "/FO", "CSV", "/NH").Output()
	if err != nil {
		return nil, err
	}
	var procs []ProcessInfo
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if line == "" { continue }
		// Format: "ImageName","PID","SessionName","Session#","MemUsage"
		parts := strings.Split(line, ",")
		if len(parts) < 5 { continue }
		name := strings.Trim(parts[0], "\"")
		pidStr := strings.Trim(parts[1], "\"")
		pid, _ := strconv.Atoi(pidStr)
		procs = append(procs, ProcessInfo{Name: name, PID: pid})
	}
	return procs, nil
}

func FilterOSProcesses(procs []ProcessInfo) []ProcessInfo {
	var filtered []ProcessInfo
	for _, p := range procs {
		excluded := false
		for _, pat := range osPatterns {
			if strings.EqualFold(p.Name, pat) { excluded = true; break }
		}
		if !excluded { filtered = append(filtered, p) }
	}
	return filtered
}
