//go:build linux

package netctrl

import (
	"fmt"
	"os/exec"
)

func SetThrottle(limitKB int) error {
	cmd := exec.Command("tc", "qdisc", "add", "dev", "eth0", "root", "tbf",
		"rate", fmt.Sprintf("%dkbit", limitKB),
		"burst", "32kbit",
		"latency", "400ms",
	)
	return cmd.Run()
}

func RemoveThrottle() error {
	cmd := exec.Command("tc", "qdisc", "del", "dev", "eth0", "root")
	return cmd.Run()
}
