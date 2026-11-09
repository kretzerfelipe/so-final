# SO Final - Gerência de Processos em Go

Aplicativo desktop (Wails + React + Tailwind + shadcn/ui) com três partes:
- `simulator/`: simulador de escalonamento (PCB, estados incluindo WAITING/E-S, Round Robin e Prioridade preemptiva).
- `winproc/`: listagem de processos e threads reais do Windows (Toolhelp32).
- `compare/`: comparação entre goroutines e threads do SO.

## Requisitos
Go, Node.js, WebView2 (já vem no Windows 11) e o CLI do Wails v2:
```
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Uso
```
wails build    # gera build/bin/sofinal.exe
wails dev      # modo desenvolvimento (hot reload)
```
> Em máquinas com Application Control, o `wails dev` e o gerador de bindings podem ser bloqueados
> (executáveis temporários). Nesse caso use `wails build` (ou `wails build -skipbindings` se a API Go não mudou).

A CLI de texto continua disponível:
```
go build -o cli.exe ./cmd/cli
./cli.exe sim -policy rr -quantum 2
./cli.exe sim -policy priority
./cli.exe list
./cli.exe threads -pid 1234
./cli.exe compare -n 1000
```

Documentação detalhada em [DOCUMENTACAO.md](DOCUMENTACAO.md).

## Próximos passos
- Estado WAITING (simulação de E/S) ✔
- Threads do Windows e prioridades ✔
- Comparação goroutines vs threads do SO ✔
- Interface gráfica ✔