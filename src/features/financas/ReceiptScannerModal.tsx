import { useRef, useState } from 'react'
import {
  Camera,
  Check,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  PackagePlus,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { compressImageForOcr, type CompressionResult } from '@/lib/imageCompressor'
import { parseReceiptWithVision, type ParsedReceiptData, type ScannedPantryItem } from '@/lib/receiptScanner'
import { db } from '@/lib/db'
import type { PantryItem } from '@/data/types'
import { toast } from '@/stores/toastStore'

const CATEGORIES = [
  'Despensa',
  'Alimentação',
  'Saúde',
  'Transporte',
  'Moradia',
  'Lazer',
  'Serviços',
  'Outros',
]

interface ReceiptScannerModalProps {
  open: boolean
  onClose: () => void
  onApply: (data: ParsedReceiptData) => void
}

export function ReceiptScannerModal({ open, onClose, onApply }: ReceiptScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [compressResult, setCompressResult] = useState<CompressionResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Editable Form State
  const [establishment, setEstablishment] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [category, setCategory] = useState('Despensa')
  const [items, setItems] = useState<ScannedPantryItem[]>([])
  const [syncWithPantry, setSyncWithPantry] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({})
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)
  const [hasResult, setHasResult] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    setHasResult(false)
    setAnalyzing(true)

    try {
      // 1. High-clarity compression with thermal contrast boost
      const compressed = await compressImageForOcr(file, 1800, 0.88)
      setCompressResult(compressed)

      // 2. Vision OCR Analysis
      const parsed = await parseReceiptWithVision(compressed.dataUrl)

      // 3. Populate editable form state
      setEstablishment(parsed.establishment || 'Cupom Fiscal')
      setAmountStr(parsed.amount > 0 ? parsed.amount.toFixed(2).replace('.', ',') : '')
      setDate(parsed.date || new Date().toISOString().slice(0, 10))
      setTime(parsed.time || '')
      setCategory(CATEGORIES.includes(parsed.category) ? parsed.category : 'Despensa')

      const detectedItems: ScannedPantryItem[] =
        parsed.detailedItems && parsed.detailedItems.length > 0
          ? parsed.detailedItems
          : (parsed.items || []).map((name) => ({ name, qty: 1, unit: 'un' }))

      setItems(detectedItems)

      // Select all items by default for pantry sync
      const initialSelected: Record<number, boolean> = {}
      detectedItems.forEach((_, idx) => {
        initialSelected[idx] = true
      })
      setSelectedItems(initialSelected)

      setHasResult(true)
      toast.success('Cupom lido com sucesso pela IA! 🧾✨')
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Falha ao analisar o cupom fiscal.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleItemSelection = (index: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const updateItem = (index: number, field: keyof ScannedPantryItem, val: string | number) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
    setSelectedItems((prev) => {
      const next: Record<number, boolean> = {}
      let newIdx = 0
      Object.keys(prev)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((k) => {
          if (Number(k) !== index) {
            next[newIdx] = prev[Number(k)]
            newIdx++
          }
        })
      return next
    })
  }

  const addItem = () => {
    setItems((prev) => {
      const next = [...prev, { name: '', qty: 1, unit: 'un' }]
      setSelectedItems((s) => ({ ...s, [next.length - 1]: true }))
      return next
    })
  }

  const handleApply = async () => {
    const numAmount = parseFloat(amountStr.replace(',', '.')) || 0

    const finalData: ParsedReceiptData = {
      establishment: establishment.trim() || 'Cupom Fiscal',
      amount: numAmount,
      date: date || new Date().toISOString().slice(0, 10),
      time: time || undefined,
      category,
      detailedItems: items.filter((it) => it.name.trim().length > 0),
      items: items.filter((it) => it.name.trim().length > 0).map((it) => it.name.trim()),
    }

    // 1. If pantry sync is enabled, replenish or add items to pantry
    const itemsToSync = finalData.detailedItems?.filter((_, idx) => selectedItems[idx]) || []

    if (syncWithPantry && itemsToSync.length > 0) {
      try {
        const currentPantry = await db.get<PantryItem>('pantry')
        let restockedCount = 0

        for (const item of itemsToSync) {
          const cleanName = item.name.trim().toLowerCase()
          if (!cleanName) continue

          const existing = currentPantry.find(
            (p) =>
              p.name.trim().toLowerCase() === cleanName ||
              p.name.trim().toLowerCase().includes(cleanName) ||
              cleanName.includes(p.name.trim().toLowerCase()),
          )

          if (existing) {
            await db.upsert('pantry', {
              ...existing,
              qty: (Number(existing.qty) || 0) + (Number(item.qty) || 1),
            })
            restockedCount++
          } else {
            const newItem: PantryItem = {
              id:
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: item.name.trim(),
              category: 'alimentos',
              qty: Number(item.qty) || 1,
              unit: item.unit || 'un',
              lowThreshold: 1,
            }
            await db.upsert('pantry', newItem)
            restockedCount++
          }
        }

        if (restockedCount > 0) {
          toast.success(`🛒 ${restockedCount} item(ns) abastecido(s) na Despensa!`)
        }
      } catch (err) {
        console.warn('[ReceiptScanner] Pantry sync failed:', err)
      }
    }

    // 2. Apply spending entry
    onApply(finalData)
    onClose()
  }

  const resetScan = () => {
    setCompressResult(null)
    setHasResult(false)
    setErrorMsg(null)
    setItems([])
    setSelectedItems({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectedCount = Object.values(selectedItems).filter(Boolean).length

  return (
    <Modal open={open} onClose={onClose} title="Scanner de Cupom Fiscal com IA 📸">
      <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload / Camera Hero State */}
        {!compressResult && !analyzing && (
          <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 sm:p-8 text-center transition-all bg-zinc-900/40 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Camera className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-zinc-100">
                Tire uma foto ou envie a imagem do Cupom
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                A IA identifica automaticamente o nome do supermercado/loja, data, valor total pago e todos os produtos.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 font-medium px-5"
              >
                <Camera className="h-4 w-4" /> Tirar Foto / Galeria
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 pt-3 border-t border-zinc-800/80 text-left text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/60">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Suporta NFC-e, SAT, Danfe e Recibos</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/60">
                <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Contraste otimizado para cupom térmico</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading / Analisando state */}
        {analyzing && (
          <div className="border border-zinc-800 rounded-2xl p-8 text-center bg-zinc-900/60 space-y-4">
            <div className="relative h-16 w-16 mx-auto">
              <Loader2 className="h-16 w-16 text-emerald-400 animate-spin opacity-80" />
              <Receipt className="h-7 w-7 text-zinc-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-100">
                Lendo cupom fiscal com IA de Visão...
              </h4>
              <p className="text-xs text-zinc-400">
                Extraindo valor total, loja, data e produtos comprados.
              </p>
            </div>

            {compressResult && (
              <span className="inline-block chip px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                ⚡ Resolução otimizada: {compressResult.width}x{compressResult.height}px ({compressResult.compressedSizeKb} KB)
              </span>
            )}
          </div>
        )}

        {/* Erro State */}
        {errorMsg && !analyzing && (
          <div className="border border-rose-500/30 bg-rose-500/10 rounded-2xl p-4 space-y-2 text-center">
            <p className="text-xs font-semibold text-rose-300">{errorMsg}</p>
            <p className="text-[11px] text-zinc-400">
              Dica: Aproxime a câmera e certifique-se de que o cabeçalho e o valor total final estão visíveis.
            </p>
            <Button variant="ghost" size="sm" onClick={resetScan} className="gap-1.5 text-xs text-zinc-300 mt-1">
              <RotateCcw className="h-3.5 w-3.5" /> Tentar outra foto
            </Button>
          </div>
        )}

        {/* Resultado Encontrado com Edição Total */}
        {hasResult && !analyzing && (
          <div className="space-y-4">
            {/* Header com Toggle de Foto */}
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" /> Conferir & Ajustar Dados
              </span>
              {compressResult && (
                <button
                  type="button"
                  onClick={() => setShowPhotoPreview(!showPhotoPreview)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-700/60"
                >
                  {showPhotoPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showPhotoPreview ? 'Ocultar Foto' : 'Ver Foto do Cupom'}</span>
                </button>
              )}
            </div>

            {/* Preview da Foto se expandido */}
            {showPhotoPreview && compressResult && (
              <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-56 flex items-center justify-center">
                <img
                  src={compressResult.dataUrl}
                  alt="Cupom Fiscal"
                  className="object-contain w-full h-full max-h-56"
                />
              </div>
            )}

            {/* Formulário Principal Editável */}
            <div className="grid sm:grid-cols-2 gap-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
              {/* Estabelecimento */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Edit2 className="h-3 w-3 text-emerald-400" /> Estabelecimento / Loja
                </label>
                <input
                  type="text"
                  value={establishment}
                  onChange={(e) => setEstablishment(e.target.value)}
                  placeholder="Ex.: Pão de Açúcar, Carrefour, Posto Shell"
                  className="input-base text-sm font-medium"
                />
              </div>

              {/* Valor Total */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-300">Valor Total Pago (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="input-base pl-9 text-base font-bold font-display text-emerald-400"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-300">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-base text-xs font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-300">Data da Compra</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-base text-xs font-mono"
                />
              </div>

              {/* Hora */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-300">Hora</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="input-base text-xs font-mono"
                />
              </div>
            </div>

            {/* Reposição na Despensa (Pantry Sync) */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncWithPantry}
                    onChange={(e) => setSyncWithPantry(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-purple-400" />
                    Repor itens na Despensa ({selectedCount}/{items.length})
                  </span>
                </label>

                {syncWithPantry && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20 transition-all"
                  >
                    <Plus className="h-3 w-3" /> Adicionar Item
                  </button>
                )}
              </div>

              {syncWithPantry && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 pt-1">
                  {items.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-2">
                      Nenhum item individual listado. Clique em &quot;Adicionar Item&quot; se desejar abastecer a despensa.
                    </p>
                  ) : (
                    items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs border transition-all ${
                          selectedItems[idx]
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
                            : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-400 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedItems[idx]}
                          onChange={() => toggleItemSelection(idx)}
                          className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 h-3.5 w-3.5 shrink-0"
                        />

                        {/* Nome do Item */}
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          placeholder="Nome do produto"
                          className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-emerald-500 p-0 text-xs font-medium text-zinc-100 focus:ring-0"
                        />

                        {/* Qtd */}
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                          className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-zinc-200"
                        />

                        {/* Unidade */}
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[11px] text-zinc-300"
                        >
                          <option value="un">un</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="l">l</option>
                          <option value="pct">pct</option>
                          <option value="cx">cx</option>
                          <option value="lat">lat</option>
                        </select>

                        {/* Deletar */}
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={resetScan} className="gap-1.5 text-xs text-zinc-400">
                <RotateCcw className="h-3.5 w-3.5" /> Outra foto
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleApply}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 font-semibold"
              >
                {syncWithPantry && selectedCount > 0 ? (
                  <>
                    <PackagePlus className="h-4 w-4" /> Salvar Gasto & Repor Despensa ({selectedCount})
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Confirmar & Preencher Gasto
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

