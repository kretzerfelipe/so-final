import {simulator} from '../../../wailsjs/go/models'

type StatProps = { label: string; value: string; hint: string }

function Stat({label, value, hint}: StatProps) {
    return (
        <div className="rounded-lg border p-3" title={hint}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
    )
}

export function Metrics({m}: { m: simulator.Metrics }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Espera média" value={m.avgWaiting.toFixed(2)}
                  hint="Ticks que o processo passa na fila de prontos."/>
            <Stat label="Turnaround médio" value={m.avgTurnaround.toFixed(2)}
                  hint="Tempo desde a admissão até o término."/>
            <Stat label="Resposta média" value={m.avgResponse.toFixed(2)}
                  hint="Tempo desde a chegada até a primeira execução."/>
            <Stat label="Uso da CPU" value={`${m.cpuUtilization.toFixed(1)}%`}
                  hint="Fração dos ticks em que a CPU executou processos (sem contar ociosidade e trocas)."/>
            <Stat label="Throughput" value={`${m.throughput.toFixed(3)} proc/tick`}
                  hint="Processos concluídos por unidade de tempo."/>
            <Stat label="Trocas de contexto" value={`${m.contextSwitches} (${m.switchTicks} ticks)`}
                  hint="Quantidade de trocas e ticks gastos nelas (overhead)."/>
        </div>
    )
}
