# Documentação

## Visão geral
O projeto tem três módulos independentes, ligados por uma CLI (`main.go`):

| Pasta        | Função                                                         |
|--------------|----------------------------------------------------------------|
| `simulator/` | Simula o escalonamento de processos (PCB, estados, algoritmos) |
| `winproc/`   | Lista processos e threads reais do Windows                     |
| `compare/`   | Compara goroutines com threads do SO                           |

## Estrutura
```
main.go                      CLI (comandos sim, list, threads e compare)
simulator/process.go         PCB e estados
simulator/scheduler.go       Algoritmos de escalonamento
winproc/winproc_windows.go   Listagem de processos (Windows)
winproc/winproc_other.go     Versão para outros SOs (retorna erro)
winproc/priority.go          Nome textual das prioridades de thread
compare/compare.go           Benchmark goroutines vs threads do SO
```

## simulator/process.go

### `type State`
Estado de um processo no ciclo de vida: `New`, `Ready`, `Running`, `Waiting`, `Terminated`.
`Waiting` é usado quando o processo está em E/S simulada (ver `WithIO`).
`String()` devolve o nome do estado em texto.

### `type Process`
O PCB (Process Control Block) simulado.

| Campo       | Significado                                   |
|-------------|-----------------------------------------------|
| `PID`       | Identificador do processo                     |
| `Name`      | Nome                                          |
| `Priority`  | Prioridade (menor valor = mais prioritário)   |
| `Arrival`   | Instante de chegada, em ticks                 |
| `Burst`     | Tempo total de CPU necessário                 |
| `Remaining` | Tempo de CPU que ainda falta                  |
| `State`     | Estado atual                                  |
| `Finish`    | Instante de término                           |
| `IOAfter`   | Ticks de CPU executados antes da E/S          |
| `IOTime`    | Duração da E/S, em ticks (`0` = sem E/S)      |
| `WakeAt`    | Instante em que a E/S termina                 |

### Funções
- `NewProcess(pid, name, priority, arrival, burst)`: cria um processo no estado `New`.
- `Turnaround()`: tempo desde a chegada até o término (`Finish - Arrival`).
- `WithIO(after, duration)`: define uma E/S única: após `after` ticks de CPU o processo vai para `Waiting` por `duration` ticks. Devolve o próprio processo (permite encadear com `NewProcess`).
- `WaitingTime()`: tempo na fila de prontos (`Turnaround - Burst - IOTime`; o tempo de E/S não conta como espera).

## simulator/scheduler.go

### `type Policy`
Algoritmo de escalonamento: `RoundRobin` (`"rr"`) ou `Priority` (`"priority"`).

### `type Result`
Resultado da simulação. `Timeline` guarda o PID que ocupou a CPU em cada tick (`0` = CPU ociosa).

### `Run(procs, policy, quantum) Result`
Executa a simulação tick a tick até todos os processos terminarem. A cada tick:
1. **Admissão**: processos que chegaram vão de `New` para `Ready`.
2. **Despertar**: processos em `Waiting` cuja E/S terminou (`WakeAt <= t`) voltam para `Ready`.
3. **Preempção**: o processo em execução volta à fila se
   - (RR) usou todo o quantum, ou
   - (Prioridade) há um pronto com prioridade melhor.
4. **Despacho**: se a CPU está livre, escolhe o próximo (RR: o primeiro da fila; Prioridade: o de melhor prioridade) e o põe em `Running`.
5. **Execução**: roda um tick; se `Remaining` chegou a 0, o processo vai para `Terminated`; senão, se chegou o ponto de E/S (`IOAfter`), vai para `Waiting` e libera a CPU.

Se todos os processos estiverem em `Waiting` ou ainda não tiverem chegado, a CPU fica ociosa (`0` na `Timeline`).

Os processos recebidos são modificados in-place (estado, `Remaining`, `Finish`).

### `bestIndex(ready)`
Função interna. Retorna o índice do processo de melhor prioridade na fila (`-1` se vazia).
Em empate vence o que está há mais tempo na fila.

## winproc

### `type Info`
Dados de um processo real: `PID`, `ParentPID`, `Threads` (quantidade), `BasePriority` e `Name`.

### `List() ([]Info, error)`
Tira um snapshot dos processos em execução usando a API Toolhelp32 do Windows
(`CreateToolhelp32Snapshot`, `Process32First`, `Process32Next`) e devolve a lista.
Fora do Windows retorna erro (arquivo `winproc_other.go`).

### `type ThreadInfo`
Dados de uma thread real: `TID`, `OwnerPID`, `BasePriority` e `DeltaPriority`.
A prioridade efetiva da thread é `BasePriority + DeltaPriority`.

### `Threads(pid) ([]ThreadInfo, error)`
Tira um snapshot das threads (`TH32CS_SNAPTHREAD`) e devolve só as do processo `pid`.
O `syscall` do Go não expõe `Thread32First`/`Thread32Next`, então são chamadas direto de `kernel32.dll`
(`LazyDLL`) com a struct `threadEntry32`. Fora do Windows retorna erro.

### `PriorityName(delta) string`
Converte o `DeltaPriority` no nome do nível do Windows (`IDLE`, `LOWEST`, `BELOW_NORMAL`, `NORMAL`,
`ABOVE_NORMAL`, `HIGHEST`, `TIME_CRITICAL`); outros valores saem como `DELTA(n)`.

## compare

### `type Result`
Resultado de uma execução: `Mode`, `N`, `Launch` (tempo até todas as tarefas estarem prontas),
`Total` (até todas terminarem), `Threads` (threads do SO criadas) e `StackKB` (memória de pilhas, em KB).

### `Run(mode, n, iters) Result`
Cria `n` tarefas que esperam uma largada comum e depois fazem `iters` iterações de trabalho.
- `"goroutine"`: goroutines comuns, multiplexadas pelo runtime em poucas threads do SO.
- `"thread"`: cada goroutine chama `runtime.LockOSThread`, então ocupa uma thread do SO só para ela.

As threads criadas são contadas pelo perfil `threadcreate` do `runtime/pprof` (funciona em qualquer SO).

## main.go

### `sim`
Roda o simulador com uma carga fixa de 4 processos (`editor` faz E/S após 1 tick por 2 ticks e `compiler` após 3 ticks por 3 ticks) e imprime a linha do tempo,
uma tabela (finish, turnaround, espera) e o tempo médio de espera.

| Flag        | Padrão | Descrição                          |
|-------------|--------|------------------------------------|
| `-policy`   | `rr`   | `rr` ou `priority`                 |
| `-quantum`  | `2`    | Quantum do Round Robin, em ticks   |

### `list`
Imprime os processos reais do Windows ordenados por PID (PID, PPID, threads, prioridade base, nome).

### `threads`
Imprime as threads de um processo real do Windows ordenadas por TID (TID, PID, prioridade base, delta, nome da prioridade) e o total.

| Flag   | Padrão          | Descrição           |
|--------|-----------------|---------------------|
| `-pid` | o próprio PID   | Processo a inspecionar |

### `compare`
Roda `compare.Run` para `goroutine` e `thread` e imprime uma tabela (lançamento, total, threads do SO, pilhas).

| Flag    | Padrão    | Descrição                          |
|---------|-----------|------------------------------------|
| `-n`    | `1000`    | Quantidade de tarefas concorrentes |
| `-work` | `2000000` | Iterações de trabalho por tarefa   |

## Como compilar e rodar
```
go build -o sofinal.exe .
./sofinal.exe sim -policy rr -quantum 2
./sofinal.exe sim -policy priority
./sofinal.exe list
./sofinal.exe threads -pid 1234
./sofinal.exe compare -n 1000
```
> Use `go build` em vez de `go run`: o Windows pode bloquear o executável temporário do `go run`.
