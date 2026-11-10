import {simulator} from '../../wailsjs/go/models'

export type Row = {
    pid: number
    name: string
    priority: number
    arrival: number
    burst: number
    ioAfter: number
    ioTime: number
    queue: number
    yieldEvery: number
    ppid: number
}

export type PolicyInfo = {
    value: string
    label: string
    description: string
    quantum: boolean
    priority: boolean
    queue: boolean
    yield: boolean
}

export const POLICIES: PolicyInfo[] = [
    {
        value: 'fifo', label: 'FIFO', quantum: false, priority: false, queue: false, yield: false,
        description: 'Não-preemptivo. O primeiro a chegar é o primeiro a executar, até terminar ou pedir E/S.',
    },
    {
        value: 'sjf', label: 'SJF (menor tarefa primeiro)', quantum: false, priority: false, queue: false, yield: false,
        description: 'Não-preemptivo. Escolhe o processo com menor tempo de CPU restante.',
    },
    {
        value: 'coop', label: 'Cooperativo', quantum: false, priority: false, queue: false, yield: true,
        description: 'Não-preemptivo. O processo só larga a CPU por vontade própria ("Cede a cada"). Com 0 ele monopoliza a CPU (Windows 3.1).',
    },
    {
        value: 'rr', label: 'Round Robin', quantum: true, priority: false, queue: false, yield: false,
        description: 'Preemptivo. Cada processo usa a CPU por um quantum e, se não terminar, volta ao fim da fila.',
    },
    {
        value: 'priority', label: 'Prioridade estática', quantum: false, priority: true, queue: false, yield: false,
        description: 'Preemptivo, sem quantum (como em tempo real). Menor número = maior prioridade, e ela nunca muda.',
    },
    {
        value: 'priority-dyn', label: 'Prioridade dinâmica', quantum: false, priority: true, queue: false, yield: false,
        description: 'Como a estática, mas o processo ganha +1 de prioridade ao sair da espera, o que favorece os I/O-bound.',
    },
    {
        value: 'mq', label: 'Múltiplas filas', quantum: true, priority: false, queue: true, yield: false,
        description: 'Filas Sistema (FIFO) > Interativos (circular com quantum) > Batch (FIFO). Uma fila só executa quando as mais prioritárias estão vazias.',
    },
    {
        value: 'mlfq', label: 'Múltiplas filas com realimentação', quantum: true, priority: false, queue: false, yield: false,
        description: 'Três filas com quantum crescente (q, 2q, 4q). Quem esgota o quantum desce de fila; a última é circular.',
    },
]

export const QUEUE_LABELS = ['Sistema', 'Interativo', 'Batch']

export function policyLabel(value: string): string {
    return POLICIES.find(p => p.value === value)?.label ?? value
}

export const STATE_LABEL: Record<string, string> = {
    NEW: 'Novo',
    READY: 'Pronto',
    RUNNING: 'Execução',
    WAITING: 'Espera',
    TERMINATED: 'Terminado',
    SUSPENDED: 'Suspenso',
}

export const STATE_STYLE: Record<string, string> = {
    NEW: 'bg-muted text-muted-foreground',
    READY: 'bg-amber-100 text-amber-800',
    RUNNING: 'bg-emerald-100 text-emerald-800',
    WAITING: 'bg-sky-100 text-sky-800',
    TERMINATED: 'bg-zinc-200 text-zinc-600',
    SUSPENDED: 'bg-violet-100 text-violet-800',
}

const PID_COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-lime-600',
]

export function pidColor(pid: number): string {
    return PID_COLORS[(pid - 1) % PID_COLORS.length]
}

export function eventText(e: simulator.Event, names: Record<number, string>): string {
    const who = `P${e.pid}${names[e.pid] ? ` (${names[e.pid]})` : ''}`
    switch (e.kind) {
        case 'arrive':
            return `${who} chegou: Novo → Pronto`
        case 'dispatch':
            return `Dispatch: ${who} recebe a CPU ${e.cpu + 1} (Pronto → Execução)`
        case 'switch':
            return `Troca de contexto na CPU ${e.cpu + 1}: ${e.detail}`
        case 'timerunout':
            return `TimeRunOut: ${who} esgotou o quantum (Execução → Pronto)`
        case 'preempt':
            return `Preempção: ${who} perdeu a CPU para um processo mais prioritário (Execução → Pronto)`
        case 'block':
            return `Block: ${who} pediu E/S, ${e.detail} (Execução → Espera)`
        case 'wakeup':
            return `WakeUp: ${who} terminou a E/S (Espera → Pronto)${e.detail ? `, ${e.detail}` : ''}`
        case 'terminate':
            return `${who} terminou`
        case 'yield':
            return `${who} cedeu a CPU voluntariamente (Execução → Pronto)`
        case 'demote':
            return `${who} desceu de fila: ${e.detail}`
        case 'suspend':
            return `${who} foi suspenso`
        case 'resume':
            return `${who} foi reativado`
        case 'kill':
            return `${who} foi destruído`
        case 'priority':
            return `${who}: ${e.detail}`
    }
    return e.kind
}

const row = (pid: number, name: string, priority: number, arrival: number, burst: number,
             extra: Partial<Row> = {}): Row => ({
    pid, name, priority, arrival, burst, ioAfter: 0, ioTime: 0, queue: 1, yieldEvery: 0, ppid: 0, ...extra,
})

export const DEFAULT_ROWS: Row[] = [
    row(1, 'browser', 2, 0, 5, {queue: 1}),
    row(2, 'editor', 1, 1, 3, {ioAfter: 1, ioTime: 2, queue: 1}),
    row(3, 'compiler', 3, 2, 6, {ioAfter: 3, ioTime: 3, queue: 2}),
    row(4, 'backup', 4, 4, 2, {queue: 2}),
]

export type Example = { name: string; policy: string; rows: Row[] }

export const EXAMPLES: Example[] = [
    {name: 'Carga padrão (mista)', policy: 'rr', rows: DEFAULT_ROWS},
    {
        name: 'CPU-bound x I/O-bound (prioridade dinâmica)', policy: 'priority-dyn',
        rows: [
            row(1, 'calculo', 3, 0, 8),
            row(2, 'leitura', 3, 0, 6, {ioAfter: 1, ioTime: 8}),
            row(3, 'relatorio', 3, 0, 5, {ioAfter: 2, ioTime: 2}),
        ],
    },
    {
        name: 'Starvation (prioridade estática)', policy: 'priority',
        rows: [
            row(1, 'tempo-real', 1, 0, 6),
            row(2, 'sistema', 1, 2, 6),
            row(3, 'batch', 5, 0, 3),
        ],
    },
    {
        name: 'Monopolização da CPU (cooperativo)', policy: 'coop',
        rows: [
            row(1, 'laco-longo', 1, 0, 9),
            row(2, 'editor', 1, 1, 3),
            row(3, 'impressao', 1, 2, 2),
        ],
    },
    {
        name: 'Múltiplas filas (sistema, interativo, batch)', policy: 'mq',
        rows: [
            row(1, 'batch-longo', 1, 0, 6, {queue: 2}),
            row(2, 'shell', 1, 1, 4, {queue: 1}),
            row(3, 'driver', 1, 2, 2, {queue: 0}),
            row(4, 'editor', 1, 3, 3, {queue: 1, ioAfter: 1, ioTime: 2}),
        ],
    },
    {
        name: 'Processo pai e filhos (árvore)', policy: 'fifo',
        rows: [
            row(1, 'pai', 1, 0, 3),
            row(2, 'filho-a', 1, 0, 5, {ppid: 1}),
            row(3, 'filho-b', 1, 0, 5, {ppid: 1}),
            row(4, 'neto', 1, 0, 4, {ppid: 2}),
            row(5, 'outro', 1, 0, 3),
        ],
    },
]
