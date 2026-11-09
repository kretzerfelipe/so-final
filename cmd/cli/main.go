package main

import (
	"flag"
	"fmt"
	"os"
	"runtime"
	"sort"
	"time"

	"sofinal/compare"
	"sofinal/simulator"
	"sofinal/winproc"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("uso: sofinal <sim|list|threads|compare> [opcoes]")
		os.Exit(1)
	}
	switch os.Args[1] {
	case "sim":
		runSim(os.Args[2:])
	case "list":
		runList()
	case "threads":
		runThreads(os.Args[2:])
	case "compare":
		runCompare(os.Args[2:])
	default:
		fmt.Println("comando desconhecido:", os.Args[1])
		os.Exit(1)
	}
}

func runSim(args []string) {
	fs := flag.NewFlagSet("sim", flag.ExitOnError)
	policy := fs.String("policy", "rr", "algoritmo: rr ou priority")
	quantum := fs.Int("quantum", 2, "quantum do Round Robin (ticks)")
	fs.Parse(args)

	procs := []*simulator.Process{
		simulator.NewProcess(1, "browser", 2, 0, 5),
		simulator.NewProcess(2, "editor", 1, 1, 3).WithIO(1, 2),
		simulator.NewProcess(3, "compiler", 3, 2, 6).WithIO(3, 3),
		simulator.NewProcess(4, "backup", 4, 4, 2),
	}

	res := simulator.Run(procs, simulator.Policy(*policy), *quantum)

	fmt.Printf("Politica: %s\n\nLinha do tempo (PID por tick, - = ociosa):\n", *policy)
	for _, pid := range res.Timeline {
		if pid == 0 {
			fmt.Print("- ")
		} else {
			fmt.Printf("%d ", pid)
		}
	}
	fmt.Printf("\n\n%-4s %-10s %-5s %-8s %-10s %-8s\n", "PID", "NAME", "PRIO", "FINISH", "TURNAROUND", "WAITING")
	totalWait := 0
	for _, p := range procs {
		fmt.Printf("%-4d %-10s %-5d %-8d %-10d %-8d\n", p.PID, p.Name, p.Priority, p.Finish, p.Turnaround(), p.WaitingTime())
		totalWait += p.WaitingTime()
	}
	fmt.Printf("\nTempo medio de espera: %.2f\n", float64(totalWait)/float64(len(procs)))
}

func runList() {
	list, err := winproc.List()
	if err != nil {
		fmt.Println("erro:", err)
		os.Exit(1)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].PID < list[j].PID })

	fmt.Printf("%-8s %-8s %-8s %-5s %s\n", "PID", "PPID", "THREADS", "PRIO", "NAME")
	for _, p := range list {
		fmt.Printf("%-8d %-8d %-8d %-5d %s\n", p.PID, p.ParentPID, p.Threads, p.BasePriority, p.Name)
	}
}

func runThreads(args []string) {
	fs := flag.NewFlagSet("threads", flag.ExitOnError)
	pid := fs.Uint("pid", uint(os.Getpid()), "PID do processo (padrao: o proprio)")
	fs.Parse(args)

	list, err := winproc.Threads(uint32(*pid))
	if err != nil {
		fmt.Println("erro:", err)
		os.Exit(1)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].TID < list[j].TID })

	fmt.Printf("%-8s %-8s %-5s %-6s %s\n", "TID", "PID", "BASE", "DELTA", "PRIORIDADE")
	for _, t := range list {
		fmt.Printf("%-8d %-8d %-5d %-6d %s\n", t.TID, t.OwnerPID, t.BasePriority, t.DeltaPriority, winproc.PriorityName(t.DeltaPriority))
	}
	fmt.Printf("\nTotal: %d threads\n", len(list))
}

func runCompare(args []string) {
	fs := flag.NewFlagSet("compare", flag.ExitOnError)
	n := fs.Int("n", 1000, "quantidade de tarefas concorrentes")
	iters := fs.Int("work", 2000000, "iteracoes de trabalho por tarefa")
	fs.Parse(args)

	fmt.Printf("%d tarefas, %d iteracoes cada, GOMAXPROCS=%d\n\n", *n, *iters, runtime.GOMAXPROCS(0))
	fmt.Printf("%-10s %-12s %-12s %-14s %s\n", "MODO", "LANCAMENTO", "TOTAL", "THREADS SO", "PILHAS (KB)")
	for _, mode := range []string{"goroutine", "thread"} {
		r := compare.Run(mode, *n, *iters)
		fmt.Printf("%-10s %-12v %-12v %-14d %d\n", r.Mode, r.Launch.Round(time.Microsecond), r.Total.Round(time.Microsecond), r.Threads, r.StackKB)
	}
	fmt.Println("\ngoroutine = goroutines comuns (multiplexadas em poucas threads do SO)")
	fmt.Println("thread    = goroutines com runtime.LockOSThread (uma thread do SO por tarefa)")
}
