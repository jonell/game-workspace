package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

var levelNames = map[Level]string{DEBUG: "DEBUG", INFO: "INFO", WARN: "WARN", ERROR: "ERROR"}

var currentLevel = DEBUG
var mu sync.Mutex
var logFile *os.File

func Init(logDir string) {
	os.MkdirAll(logDir, 0755)
	date := time.Now().Format("2006-01-02")
	path := filepath.Join(logDir, fmt.Sprintf("agent-%s.log", date))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		log.Printf("Failed to open log file %s: %v", path, err)
		return
	}
	logFile = f
	multiWriter := io.MultiWriter(os.Stdout, f)
	log.SetOutput(multiWriter)
	log.SetFlags(0)
	Infof("Agent logger initialized, file=%s", path)
}

func write(level Level, format string, args ...interface{}) {
	if level < currentLevel { return }
	ts := time.Now().Format(time.RFC3339)
	label := levelNames[level]
	msg := fmt.Sprintf(format, args...)
	mu.Lock()
	defer mu.Unlock()
	log.Println(fmt.Sprintf("[%s] [%s] %s", ts, label, msg))
}

func Debugf(format string, args ...interface{}) { write(DEBUG, format, args...) }
func Infof(format string, args ...interface{})  { write(INFO, format, args...) }
func Warnf(format string, args ...interface{})  { write(WARN, format, args...) }
func Errorf(format string, args ...interface{}) { write(ERROR, format, args...) }
