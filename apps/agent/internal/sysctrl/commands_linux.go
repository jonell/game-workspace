//go:build linux

package sysctrl

import "os/exec"

func Shutdown() error {
	return exec.Command("systemctl", "poweroff").Run()
}

func Restart() error {
	return exec.Command("systemctl", "reboot").Run()
}
