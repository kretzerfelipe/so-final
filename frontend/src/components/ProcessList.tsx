import {useCallback, useEffect, useMemo, useState} from 'react'
import {RefreshCw} from 'lucide-react'
import {ListProcesses, ListThreads} from '../../wailsjs/go/main/App'
import {main, winproc} from '../../wailsjs/go/models'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'

const REFRESH_MS = 2000

export function ProcessList() {
    const [list, setList] = useState<winproc.Info[]>([])
    const [threads, setThreads] = useState<main.ThreadRow[]>([])
    const [selected, setSelected] = useState<winproc.Info | null>(null)
    const [filter, setFilter] = useState('')
    const [live, setLive] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        try {
            setList(await ListProcesses())
            setError('')
        } catch (e) {
            setError(String(e))
        }
    }, [])

    const loadThreads = useCallback(async (pid: number) => {
        try {
            setThreads(await ListThreads(pid))
            setError('')
        } catch (e) {
            setThreads([])
            setError(String(e))
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        if (selected) loadThreads(selected.pid)
    }, [selected, loadThreads])

    useEffect(() => {
        if (!live) return
        const id = setInterval(() => {
            load()
            if (selected) loadThreads(selected.pid)
        }, REFRESH_MS)
        return () => clearInterval(id)
    }, [live, load, loadThreads, selected])

    const visible = useMemo(() => {
        const term = filter.trim().toLowerCase()
        return term ? list.filter(p => p.name.toLowerCase().includes(term) || String(p.pid) === term) : list
    }, [list, filter])

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Processos em execução <Badge variant="secondary">{visible.length}</Badge>
                    </CardTitle>
                    <CardDescription>
                        Dados reais do Windows (Toolhelp32): o PCB que o sistema operacional mantém. Clique em um
                        processo para ver suas threads.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Filtrar por nome ou PID"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                        <Button variant="outline" onClick={load}><RefreshCw/> Atualizar</Button>
                        <Button variant={live ? 'default' : 'outline'} onClick={() => setLive(!live)}>
                            {live ? 'Ao vivo: ligado' : 'Ao vivo: desligado'}
                        </Button>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="max-h-80 overflow-auto rounded-md border">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead>PID</TableHead>
                                    <TableHead>PPID</TableHead>
                                    <TableHead>Threads</TableHead>
                                    <TableHead>Prioridade base</TableHead>
                                    <TableHead>Nome</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map(p => (
                                    <TableRow
                                        key={p.pid}
                                        className="cursor-pointer"
                                        data-state={selected?.pid === p.pid ? 'selected' : undefined}
                                        onClick={() => setSelected(p)}
                                    >
                                        <TableCell className="font-mono">{p.pid}</TableCell>
                                        <TableCell className="font-mono text-muted-foreground">{p.parentPid}</TableCell>
                                        <TableCell className="tabular-nums">{p.threads}</TableCell>
                                        <TableCell className="tabular-nums">{p.basePriority}</TableCell>
                                        <TableCell>{p.name}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {selected && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Threads de {selected.name} <Badge variant="secondary">{threads.length}</Badge>
                        </CardTitle>
                        <CardDescription>
                            PID {selected.pid} · prioridade efetiva = base + delta. O escalonador do Windows
                            usa essa prioridade para escolher qual thread executa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-64 overflow-auto rounded-md border">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background">
                                    <TableRow>
                                        <TableHead>TID</TableHead>
                                        <TableHead className="text-right">Base</TableHead>
                                        <TableHead className="text-right">Delta</TableHead>
                                        <TableHead className="text-right">Efetiva</TableHead>
                                        <TableHead>Nível</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {threads.map(t => (
                                        <TableRow key={t.tid}>
                                            <TableCell className="font-mono">{t.tid}</TableCell>
                                            <TableCell className="text-right tabular-nums">{t.basePriority}</TableCell>
                                            <TableCell className="text-right tabular-nums">{t.deltaPriority}</TableCell>
                                            <TableCell className="text-right tabular-nums">{t.priority}</TableCell>
                                            <TableCell><Badge variant="outline">{t.priorityName}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
