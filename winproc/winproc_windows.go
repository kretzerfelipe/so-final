package winproc

import (
	"syscall"
	"unsafe"
)

type Info struct {
	PID          uint32 `json:"pid"`
	ParentPID    uint32 `json:"parentPid"`
	Threads      uint32 `json:"threads"`
	BasePriority int32  `json:"basePriority"`
	Name         string `json:"name"`
}

func List() ([]Info, error) {
	snap, err := syscall.CreateToolhelp32Snapshot(syscall.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil, err
	}
	defer syscall.CloseHandle(snap)

	var entry syscall.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))
	if err := syscall.Process32First(snap, &entry); err != nil {
		return nil, err
	}

	var list []Info
	for {
		list = append(list, Info{
			PID:          entry.ProcessID,
			ParentPID:    entry.ParentProcessID,
			Threads:      entry.Threads,
			BasePriority: entry.PriClassBase,
			Name:         syscall.UTF16ToString(entry.ExeFile[:]),
		})
		if err := syscall.Process32Next(snap, &entry); err != nil {
			break
		}
	}
	return list, nil
}

type ThreadInfo struct {
	TID           uint32 `json:"tid"`
	OwnerPID      uint32 `json:"ownerPid"`
	BasePriority  int32  `json:"basePriority"`
	DeltaPriority int32  `json:"deltaPriority"`
}

type threadEntry32 struct {
	Size           uint32
	Usage          uint32
	ThreadID       uint32
	OwnerProcessID uint32
	BasePri        int32
	DeltaPri       int32
	Flags          uint32
}

var (
	kernel32          = syscall.NewLazyDLL("kernel32.dll")
	procThread32First = kernel32.NewProc("Thread32First")
	procThread32Next  = kernel32.NewProc("Thread32Next")
)

func Threads(pid uint32) ([]ThreadInfo, error) {
	snap, err := syscall.CreateToolhelp32Snapshot(syscall.TH32CS_SNAPTHREAD, 0)
	if err != nil {
		return nil, err
	}
	defer syscall.CloseHandle(snap)

	var entry threadEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))
	r, _, e := procThread32First.Call(uintptr(snap), uintptr(unsafe.Pointer(&entry)))
	if r == 0 {
		return nil, e
	}

	var list []ThreadInfo
	for {
		if entry.OwnerProcessID == pid {
			list = append(list, ThreadInfo{
				TID:           entry.ThreadID,
				OwnerPID:      entry.OwnerProcessID,
				BasePriority:  entry.BasePri,
				DeltaPriority: entry.DeltaPri,
			})
		}
		r, _, _ := procThread32Next.Call(uintptr(snap), uintptr(unsafe.Pointer(&entry)))
		if r == 0 {
			break
		}
	}
	return list, nil
}
