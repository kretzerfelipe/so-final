//go:build !windows

package winproc

import "errors"

type Info struct {
	PID          uint32 `json:"pid"`
	ParentPID    uint32 `json:"parentPid"`
	Threads      uint32 `json:"threads"`
	BasePriority int32  `json:"basePriority"`
	Name         string `json:"name"`
}

func List() ([]Info, error) {
	return nil, errors.New("listagem de processos suportada apenas no Windows")
}

type ThreadInfo struct {
	TID           uint32 `json:"tid"`
	OwnerPID      uint32 `json:"ownerPid"`
	BasePriority  int32  `json:"basePriority"`
	DeltaPriority int32  `json:"deltaPriority"`
}

func Threads(pid uint32) ([]ThreadInfo, error) {
	return nil, errors.New("listagem de threads suportada apenas no Windows")
}
