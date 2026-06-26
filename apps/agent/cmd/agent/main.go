package main

import (
	"log"

	"github.com/chunlv/agent/internal/config"
	"github.com/chunlv/agent/internal/engine"
	"github.com/chunlv/agent/internal/tray"
	"github.com/chunlv/agent/internal/wsclient"
)

func main() {
	cfg := config.Load()
	config.Update(cfg)

	log.Printf("Chunlv Agent starting...")
	log.Printf("  Server: %s", cfg.ServerURL)

	tracker := engine.NewTimeTracker()
	wsClient := wsclient.NewClient(cfg.ServerURL, "", "", tracker)

	onReconfig := func(newCfg config.AgentConfig) {
		log.Printf("Config changed, reconnecting to %s", newCfg.ServerURL)
		wsClient.Disconnect()
		wsClient = wsclient.NewClient(newCfg.ServerURL, "", "", tracker)
		go wsClient.Connect()
	}

	tray.Run(tracker, wsClient, onReconfig)
}
