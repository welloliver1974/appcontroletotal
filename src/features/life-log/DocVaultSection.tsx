import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Copy, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { api } from '@/data/api'
import { toast } from '@/stores/toastStore'
import { usePendingDelete } from '@/lib/usePendingDelete'
import { cn } from '@/lib/utils'
import type { DocVaultItem } from '@/data/types'

const CATEGORIES = [
  { id: 'veiculo', label: '🚗 Veículo' },
  { id: 'casa', label: '🏠 Casa' },
  { id: 'saude', label: '💊 Saúde' },
  { id: 'financeiro', label: '💳 Financeiro' },
  { id: 'pessoal', label: '👤 Pessoal / Geral' },
]

export function DocVaultSection({ className }: { className?: string }) {
  const [docs, setDocs] = useState<DocVaultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [category, setCategory] = useState('veiculo')
  const [extra, setExtra] = useState('')

  const { pendingDelete, request } = usePendingDelete()

  useEffect(() => {
    api
      .list<DocVaultItem>('docVault')
      .then((res) => {
        if (Array.isArray(res)) {
          setDocs(res)
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar cofre:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = async (val: string, name: string) => {
    try {
      await navigator.clipboard.writeText(val)
      toast.success(`"${name}" copiado para a área de transferência! 📋`)
    } catch {
      toast.info(val)
    }
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !value.trim()) return

    const newDoc: Omit<DocVaultItem, 'id'> = {
      title: title.trim(),
      value: value.trim(),
      category,
      extra: extra.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    const created = await api.create<DocVaultItem>('docVault', newDoc).catch(() => ({
      ...newDoc,
      id: `doc-${Date.now()}`,
    }))

    setDocs((prev) => [created, ...prev])
    setTitle('')
    setValue('')
    setExtra('')
    setShowAdd(false)
    toast.success('Documento salvo no cofre com sucesso! 🔒')
  }

  const handleRemove = async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id))
    try {
      await api.remove<DocVaultItem>('docVault', id)
      toast.success('Documento removido do cofre 🗑️')
    } catch (err) {
      console.error('Erro ao remover documento:', err)
      toast.error('Erro ao remover item do cofre.')
    }
  }

  const filteredDocs = useMemo(() => {
    let list = docs
    if (selectedCat) {
      list = list.filter((d) => d.category.toLowerCase() === selectedCat.toLowerCase())
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.value.toLowerCase().includes(q) ||
          (d.extra && d.extra.toLowerCase().includes(q)),
      )
    }
    return list
  }, [docs, selectedCat, search])

  if (loading) return null

  return (
    <Card className={cn('flex flex-col border-emerald-500/20 bg-zinc-900/60', className)}>
      <CardHeader
        title="Cofre de Documentos & Chaves 🔒"
        subtitle={`${docs.length} registros seguros salvos`}
        action={
          <Button
            variant="soft"
            size="sm"
            onClick={() => setShowAdd((s) => !s)}
            className="text-emerald-300 border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25"
          >
            <Plus className="h-3.5 w-3.5" /> {showAdd ? 'Cancelar' : 'Novo Documento'}
          </Button>
        }
      />

      <div className="p-4 space-y-3">
        {/* Formulário de Adição */}
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="space-y-3 rounded-2xl border border-emerald-500/30 bg-white/[0.02] p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Título / O que é?</label>
                <input
                  className="input-base text-xs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Renavam do Carro, Medidas Cama, Cartão SUS"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Categoria</label>
                <select
                  className="input-base text-xs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">
                Valor Principal (Número, Chave ou Medida)
              </label>
              <input
                className="input-base text-xs font-mono font-bold text-emerald-300"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ex.: 00123456789 ou 1,38m x 1,88m"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Observações adicionais (opcional)</label>
              <input
                className="input-base text-xs"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Ex.: Placa ABC-1234, titular, modelo HEPA..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={!title.trim() || !value.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Salvar no Cofre
              </Button>
            </div>
          </form>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedCat(null)}
              className={cn(
                'chip px-2 py-0.5 text-[11px] transition-colors',
                selectedCat === null
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800',
              )}
            >
              Todos ({docs.length})
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCat(selectedCat === c.id ? null : c.id)}
                className={cn(
                  'chip px-2 py-0.5 text-[11px] transition-colors',
                  selectedCat === c.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                    : 'text-zinc-400 hover:bg-zinc-800',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar documento ou chave..."
              className="w-full h-7 pl-7 pr-6 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Documentos */}
        {filteredDocs.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500">
            Nenhum documento encontrado neste filtro.
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/90 hover:border-zinc-700 transition-all flex flex-col justify-between gap-2 group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 block">
                      {doc.category}
                    </span>
                    <p className="text-xs font-semibold text-zinc-100 truncate">{doc.title}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(doc.value, doc.title)}
                      className="h-6 px-2 text-[11px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      title="Copiar valor"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copiar</span>
                    </Button>

                    {pendingDelete === doc.id ? (
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => request(doc.id, () => void handleRemove(doc.id))}
                      >
                        OK?
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir documento"
                        onClick={() => request(doc.id, () => void handleRemove(doc.id))}
                        className="h-6 w-6 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-200 truncate select-all">
                    {doc.value}
                  </span>
                </div>

                {doc.extra && <p className="text-[11px] text-zinc-500 truncate">{doc.extra}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
