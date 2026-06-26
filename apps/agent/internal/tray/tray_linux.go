//go:build linux

package tray

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/chunlv/agent/internal/config"
	"github.com/chunlv/agent/internal/engine"
	"github.com/chunlv/agent/internal/netctrl"
	"github.com/chunlv/agent/internal/sysctrl"
	"github.com/chunlv/agent/internal/wsclient"
)

// Run starts the agent without a system tray (Linux).
// It blocks until SIGINT, SIGTERM, or a kick command is received.
func Run(addr string, tracker *engine.TimeTracker, client *wsclient.Client,
	httpStart func(string, *engine.TimeTracker, *wsclient.Client, func(config.AgentConfig)),
	onReconfig func(config.AgentConfig)) {

	go client.Connect()
	httpStart(addr, tracker, client, onReconfig)

	log.Println("Agent running (Linux mode — no system tray)")
	log.Printf("  WebUI: http://localhost%s", addr)

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case sig := <-sigChan:
			log.Printf("Received signal %v, shutting down...", sig)
			client.Disconnect()
			return
		case cmd := <-client.CommandChan:
			log.Printf("Executing command: %s", cmd.Command)
			var err error
			switch cmd.Command {
			case "shutdown":
				err = sysctrl.Shutdown()
			case "restart":
				err = sysctrl.Restart()
			case "throttle":
				err = netctrl.SetThrottle(cmd.Params.LimitKB)
			case "unthrottle":
				err = netctrl.RemoveThrottle()
			case "kick":
				log.Println("Kicked by admin — shutting down")
				client.Disconnect()
				return
			default:
				log.Printf("Unknown command: %s", cmd.Command)
			}
			if err != nil {
				log.Printf("Command %s failed: %v", cmd.Command, err)
			}
			client.SendAck(cmd.Command, err == nil)
		}
	}
}
