# SO Final - Gerência de Processos em Go

Duas partes:
- `simulator/`: simulador de escalonamento (PCB, estados incluindo WAITING/E-S, Round Robin e Prioridade preemptiva).
- `winproc/`: listagem de processos e threads reais do Windows (Toolhelp32).
- `compare/`: comparação entre goroutines e threads do SO.

## Uso
```
go build -o sofinal.exe .
./sofinal.exe sim -policy rr -quantum 2
./sofinal.exe sim -policy priority
./sofinal.exe list
./sofinal.exe threads -pid 1234
./sofinal.exe compare -n 1000
```

Documentação detalhada em [DOCUMENTACAO.md](DOCUMENTACAO.md).

## Próximos passos
- Estado WAITING (simulação de E/S) ✔
- Threads do Windows e prioridades ✔
- Comparação goroutines vs threads do SO ✔
