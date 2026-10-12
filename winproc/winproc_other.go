//go:build !windows

package winproc

import "errors"

type Info struct {
	PID          uint32
	ParentPID    uint32
	Threads      uint32
	BasePriority int32
	Name         string
}

func List() ([]Info, error) {
	return nil, errors.New("listagem de processos suportada apenas no Windows")
}

type ThreadInfo struct {
	TID           uint32
	OwnerPID      uint32
	BasePriority  int32
	DeltaPriority int32
}

func Threads(pid uint32) ([]ThreadInfo, error) {
	return nil, errors.New("listagem de threads suportada apenas no Windows")
}
