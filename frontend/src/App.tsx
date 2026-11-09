import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Simulator} from '@/components/Simulator'
import {ProcessList} from '@/components/ProcessList'
import {Compare} from '@/components/Compare'

function App() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">Gerência de Processos</h1>
                    <p className="text-sm text-muted-foreground">
                        Escalonamento simulado, processos e threads reais do Windows, e goroutines vs threads do SO.
                    </p>
                </header>

                <Tabs defaultValue="simulator">
                    <TabsList>
                        <TabsTrigger value="simulator">Simulador</TabsTrigger>
                        <TabsTrigger value="processes">Processos e threads</TabsTrigger>
                        <TabsTrigger value="compare">Goroutines vs threads</TabsTrigger>
                    </TabsList>
                    <TabsContent value="simulator" className="mt-4">
                        <Simulator/>
                    </TabsContent>
                    <TabsContent value="processes" className="mt-4">
                        <ProcessList/>
                    </TabsContent>
                    <TabsContent value="compare" className="mt-4">
                        <Compare/>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default App
