# SO Final - Gerência de Processos em Go

Aplicativo desktop (Wails + React + Tailwind + shadcn/ui) com três partes:
- `simulator/`: simulador de escalonamento baseado nos slides da disciplina. Algoritmos: FIFO, SJF, Cooperativo,
  Round Robin, Prioridade estática e dinâmica, Múltiplas filas e Múltiplas filas com realimentação. Tem várias CPUs, custo
  de troca de contexto, métricas, passo a passo com diagrama de estados, PCB e operações sobre processos (suspender,
  reativar, alterar prioridade, destruir).
- `winproc/`: processos e threads reais do Windows (Toolhelp32).
- `compare/`: comparação entre goroutines e threads do SO.

## Requisitos
Go, Node.js, WebView2 (já vem no Windows 11) e o CLI do Wails v2:
```
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Uso
```
wails build -skipbindings   # gera build/bin/sofinal.exe
go test ./...               # testes do simulador
```
> Em máquinas com Application Control, `wails dev`, o gerador de bindings e até o `go test` podem ser bloqueados
> (executáveis temporários). Veja o passo a passo em [DOCUMENTACAO.md](DOCUMENTACAO.md#como-compilar-rodar-e-testar).

A CLI de texto continua disponível:
```
go build -o cli.exe ./cmd/cli
./cli.exe sim -policy rr -quantum 2
./cli.exe list
./cli.exe threads -pid 1234
./cli.exe compare -n 1000
```

Documentação detalhada, com o mapa dos slides para o código e as limitações, em [DOCUMENTACAO.md](DOCUMENTACAO.md).
