package main

import (
	"log"
	"path/filepath"

	"github.com/chunlv/agent/internal/config"
	"github.com/chunlv/agent/internal/engine"
	"github.com/chunlv/agent/internal/httplocal"
	"github.com/chunlv/agent/internal/logger"
	"github.com/chunlv/agent/internal/tray"
	"github.com/chunlv/agent/internal/wsclient"
)

func main() {
	cfg := config.Load()
	config.Update(cfg)

	execDir, _ := filepath.Abs(".")
	logger.Init(filepath.Join(execDir, "logs"))

	logger.Infof("Chunlv Agent starting...")
	logger.Infof("Server: %s", cfg.ServerURL)

	tracker := engine.NewTimeTracker()
	wsClient := wsclient.NewClient(cfg.ServerURL, cfg.Username, cfg.Password, tracker)

	onReconfig := func(newCfg config.AgentConfig) {
		log.Printf("Config changed, reconnecting to %s as %s", newCfg.ServerURL, newCfg.Username)
		wsClient.Disconnect()
		wsClient = wsclient.NewClient(newCfg.ServerURL, newCfg.Username, newCfg.Password, tracker)
		go wsClient.Connect()
	}

	httpStart := func(addr string, tracker *engine.TimeTracker, wsClient *wsclient.Client, onReconfig func(config.AgentConfig)) {
		httplocal.StartAsync(addr, tracker, wsClient, onReconfig)
	}

	tray.Run(":9876", tracker, wsClient, httpStart, onReconfig)
}
