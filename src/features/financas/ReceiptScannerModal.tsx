import { useRef, useState } from 'react'
import {
  Camera,
  Check,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Loader2,
  PackagePlus,
  Plus,
  QrCode,
  Receipt,
  RotateCcw,
  Scan,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { compressImageForOcr, type CompressionResult } from '@/lib/imageCompressor'
import { parseReceiptWithVision, type ParsedReceiptData, type ScannedPantryItem } from '@/lib/receiptScanner'
import { detectQrCodeFromFile, parseSefazUrl, type SefazQrCodeData } from '@/lib/qrReceiptReader'
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
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const fullFileInputRef = useRef<HTMLInputElement>(null)

  const [compressResult, setCompressResult] = useState<CompressionResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Manual URL input state
  const [showManualUrl, setShowManualUrl] = useState(false)
  const [manualUrl, setManualUrl] = useState('')

  // Editable Form State
  const [establishment, setEstablishment] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [category, setCategory] = useState('Despensa')
  const [items, setItems] = useState<ScannedPantryItem[]>([])
  const [syncWithPantry, setSyncWithPantry] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({})
  const [qrInfo, setQrInfo] = useState<SefazQrCodeData | null>(null)
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)
  const [hasResult, setHasResult] = useState(false)

  // Apply parsed QR result into form
  const applyQrResult = (qr: SefazQrCodeData) => {
    setQrInfo(qr)
    setErrorMsg(null)

    const storeLabel = qr.cnpj ? `Nota Fiscal (CNPJ ${qr.cnpj})` : qr.model || 'Nota Fiscal SEFAZ'
    setEstablishment(storeLabel)
    if (qr.totalAmount && qr.totalAmount > 0) {
      setAmountStr(qr.totalAmount.toFixed(2).replace('.', ','))
    }
    setDate(qr.date || new Date().toISOString().slice(0, 10))
    setTime('')
    setCategory('Despensa')
    setSyncWithPantry(false) // No products detected from bare QR code
    setItems([])
    setSelectedItems({})
    setHasResult(true)
    toast.success('QR Code SEFAZ lido com sucesso! 🧾✨')
  }

  // 1. Fotografar QR Code de perto (Modo Rápido com Câmera Nativa)
  const handleQrPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    setHasResult(false)
    setAnalyzing(true)
    setQrInfo(null)

    try {
      // Decode QR Code directly from full-resolution native camera file
      const qr = await detectQrCodeFromFile(file)

      if (qr) {
        applyQrResult(qr)
      } else {
        // Fallback: If QR couldn't be decoded, run AI vision on the image
        const compressed = await compressImageForOcr(file, 1800, 0.88)
        setCompressResult(compressed)
        const parsed = await parseReceiptWithVision(compressed.dataUrl, file)

        setEstablishment(parsed.establishment || 'Cupom Fiscal')
        setAmountStr(parsed.amount > 0 ? parsed.amount.toFixed(2).replace('.', ',') : '')
        setDate(parsed.date || new Date().toISOString().slice(0, 10))
        setTime(parsed.time || '')
        if (parsed.qrCode) setQrInfo(parsed.qrCode)

        const detectedCat = CATEGORIES.includes(parsed.category) ? parsed.category : 'Despensa'
        setCategory(detectedCat)
        setSyncWithPantry(detectedCat === 'Despensa')

        const detectedItems: ScannedPantryItem[] =
          parsed.detailedItems && parsed.detailedItems.length > 0
            ? parsed.detailedItems
            : (parsed.items || []).map((name) => ({ name, qty: 1, unit: 'un' }))

        setItems(detectedItems)
        const initialSelected: Record<number, boolean> = {}
        detectedItems.forEach((_, idx) => {
          initialSelected[idx] = true
        })
        setSelectedItems(initialSelected)

        setHasResult(true)
        toast.success('Cupom analisado pela IA! 🧾✨')
      }
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Falha ao analisar a foto do QR Code.'
      setErrorMsg(msg)
      toast.error('Erro ao ler QR Code.')
    } finally {
      setAnalyzing(false)
      if (qrFileInputRef.current) qrFileInputRef.current.value = ''
    }
  }

  // 2. Fotografar Cupom Completo para IA & Despensa
  const handleFullReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    setHasResult(false)
    setAnalyzing(true)
    setQrInfo(null)

    try {
      const compressed = await compressImageForOcr(file, 1800, 0.88)
      setCompressResult(compressed)

      const parsed = await parseReceiptWithVision(compressed.dataUrl, file)

      setEstablishment(parsed.establishment || 'Cupom Fiscal')
      setAmountStr(parsed.amount > 0 ? parsed.amount.toFixed(2).replace('.', ',') : '')
      setDate(parsed.date || new Date().toISOString().slice(0, 10))
      setTime(parsed.time || '')
      if (parsed.qrCode) setQrInfo(parsed.qrCode)

      const detectedCat = CATEGORIES.includes(parsed.category) ? parsed.category : 'Despensa'
      setCategory(detectedCat)
      setSyncWithPantry(detectedCat === 'Despensa')

      const detectedItems: ScannedPantryItem[] =
        parsed.detailedItems && parsed.detailedItems.length > 0
          ? parsed.detailedItems
          : (parsed.items || []).map((name) => ({ name, qty: 1, unit: 'un' }))

      setItems(detectedItems)
      const initialSelected: Record<number, boolean> = {}
      detectedItems.forEach((_, idx) => {
        initialSelected[idx] = true
      })
      setSelectedItems(initialSelected)

      setHasResult(true)
      toast.success(
        parsed.qrCode
          ? 'Cupom + QR Code SEFAZ lidos com sucesso! 🧾✨'
          : 'Cupom lido com sucesso pela IA! 🧾✨',
      )
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Falha ao analisar o cupom fiscal.'
      setErrorMsg(msg)
      toast.error('Erro ao ler cupom fiscal.')
    } finally {
      setAnalyzing(false)
      if (fullFileInputRef.current) fullFileInputRef.current.value = ''
    }
  }

  // 3. Manual URL Submit
  const handleManualUrlSubmit = () => {
    if (!manualUrl.trim()) return
    const parsed = parseSefazUrl(manualUrl.trim())
    if (parsed) {
      applyQrResult(parsed)
      setManualUrl('')
      setShowManualUrl(false)
    } else {
      toast.error('URL da SEFAZ inválida. Cole o link completo do QR Code.')
    }
  }

  const handleApply = async () => {
    const parsedAmount = parseFloat(amountStr.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0

    // 1. Stock pantry items if enabled
    if (syncWithPantry && items.length > 0) {
      const itemsToStock = items.filter((_, idx) => selectedItems[idx])
      let stockedCount = 0

      for (const it of itemsToStock) {
        if (!it.name.trim()) continue
        try {
          const newItem: PantryItem = {
            id:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `pantry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: it.name.trim(),
            category: category === 'Despensa' ? 'alimentos' : category.toLowerCase(),
            qty: Number(it.qty) || 1,
            unit: it.unit || 'un',
            lowThreshold: 1,
          }
          await db.upsert('pantry', newItem)
          stockedCount++
        } catch (err) {
          console.error('[PantryStock] Failed to stock item:', it.name, err)
        }
      }

      if (stockedCount > 0) {
        toast.success(`${stockedCount} item(ns) adicionados à Despensa! 📦`)
      }
    }

    // 2. Return spending data to parent form
    const finalData: ParsedReceiptData = {
      establishment: establishment.trim() || 'Cupom Fiscal',
      amount: parsedAmount,
      date: date || new Date().toISOString().slice(0, 10),
      time: time || undefined,
      category,
      items: items.map((i) => i.name),
      detailedItems: items,
      qrCode: qrInfo || undefined,
    }

    onApply(finalData)
    onClose()
  }

  const resetScan = () => {
    setCompressResult(null)
    setHasResult(false)
    setErrorMsg(null)
    setItems([])
    setSelectedItems({})
    if (qrFileInputRef.current) qrFileInputRef.current.value = ''
    if (fullFileInputRef.current) fullFileInputRef.current.value = ''
  }

  const selectedCount = Object.values(selectedItems).filter(Boolean).length

  return (
    <Modal open={open} onClose={onClose} title="Scanner de Cupom & QR Code 📸">
      <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
        {/* Hidden Inputs for Native Camera */}
        <input
          type="file"
          ref={qrFileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleQrPhotoChange}
          className="hidden"
        />
        <input
          type="file"
          ref={fullFileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFullReceiptChange}
          className="hidden"
        />

        {/* Hero Options Selection State */}
        {!compressResult && !analyzing && !hasResult && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center bg-zinc-900/40 space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-zinc-100">
                  Como você deseja escanear o cupom?
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Tire a foto de perto do QR Code para leitura instantânea ou fotografe o cupom inteiro para a IA extrair os produtos.
                </p>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {/* Opção 1: Fotografar QR Code */}
                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all group flex flex-col justify-between space-y-3 shadow-lg shadow-emerald-500/5 hover:border-emerald-500"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Scan className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Mais Rápido ⚡
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      Fotografar QR Code
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      Abre a câmera em foco máximo para tirar a foto de perto do QR Code da SEFAZ.
                    </p>
                  </div>
                </button>

                {/* Opção 2: Foto Completa com IA */}
                <button
                  type="button"
                  onClick={() => fullFileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/80 hover:border-zinc-700 text-left transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                      Lê Produtos 🛒
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      Foto Completa do Cupom (IA)
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      Fotografa o cupom inteiro para a IA ler todos os itens e abastecer a Despensa.
                    </p>
                  </div>
                </button>
              </div>

              {/* Botão de Link Manual */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualUrl(!showManualUrl)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1.5 mx-auto transition-colors"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>{showManualUrl ? 'Cancelar link manual' : 'Inserir link do QR Code manualmente'}</span>
                </button>

                {showManualUrl && (
                  <div className="flex gap-2 mt-2 max-w-md mx-auto">
                    <input
                      type="url"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://www.nfce.fazenda.sp.gov.br/consulta?p=..."
                      className="input-base text-xs flex-1"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleManualUrlSubmit}
                      disabled={!manualUrl.trim()}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500"
                    >
                      OK
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-zinc-500 border-t border-zinc-800/60">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Suporta cupons SAT, NFC-e, Padarias, Farmácias e Restaurantes</span>
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
                Processando documento fiscal...
              </h4>
              <p className="text-xs text-zinc-400">
                Decodificando dados da SEFAZ e extraindo informações.
              </p>
            </div>
          </div>
        )}

        {/* Erro */}
        {errorMsg && !analyzing && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex flex-col items-center gap-2 text-center">
            <span>{errorMsg}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetScan}
              className="text-xs gap-1.5 text-zinc-300 hover:text-white"
            >
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

            {/* Badge de QR Code SEFAZ se detectado */}
            {qrInfo && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">QR Code SEFAZ Identificado:</span>{' '}
                  <span className="text-zinc-300 font-mono text-[11px]">
                    {qrInfo.model || 'NFC-e'} {qrInfo.uf ? `(${qrInfo.uf})` : ''} {qrInfo.cnpj ? `CNPJ ${qrInfo.cnpj}` : ''}
                  </span>
                </div>
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
                  placeholder="Nome do estabelecimento"
                  className="input-base text-sm font-semibold text-zinc-100"
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
                  onChange={(e) => {
                    const newCat = e.target.value
                    setCategory(newCat)
                    if (newCat === 'Alimentação') {
                      setSyncWithPantry(false)
                    } else if (newCat === 'Despensa') {
                      setSyncWithPantry(true)
                    }
                  }}
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
                    onClick={() => {
                      setItems((prev) => {
                        const next = [...prev, { name: '', qty: 1, unit: 'un' }]
                        setSelectedItems((s) => ({ ...s, [next.length - 1]: true }))
                        return next
                      })
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20 transition-all"
                  >
                    <Plus className="h-3 w-3" /> Adicionar Item
                  </button>
                )}
              </div>

              {/* Dica contextual de categoria */}
              <div className="text-[11px] text-zinc-400 bg-zinc-950/50 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
                {category === 'Alimentação' ? (
                  <span>
                    ☕ <strong>Alimentação / Padaria:</strong> Itens para consumo imediato (não vão para o estoque por padrão). Marque a caixa acima se quiser estocá-los.
                  </span>
                ) : category === 'Despensa' ? (
                  <span>
                    🛒 <strong>Despensa / Supermercado:</strong> Abastecimento automático de estoque doméstico ativado.
                  </span>
                ) : (
                  <span>
                    📦 Marque a caixa acima apenas se desejar cadastrar esses itens na sua despensa de mantimentos.
                  </span>
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
                          onChange={(e) =>
                            setSelectedItems((prev) => ({
                              ...prev,
                              [idx]: e.target.checked,
                            }))
                          }
                          className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 h-4 w-4 shrink-0"
                        />

                        {/* Nome do Produto */}
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value
                            setItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, name: val } : it)),
                            )
                          }}
                          placeholder="Nome do produto"
                          className="flex-1 min-w-0 bg-transparent border-0 border-b border-transparent focus:border-emerald-500 p-0 text-xs font-medium text-zinc-200 focus:ring-0"
                        />

                        {/* Quantidade */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 1
                              setItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, qty: val } : it)),
                              )
                            }}
                            className="w-12 bg-zinc-800/80 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs font-mono"
                          />
                          <span className="text-[10px] text-zinc-400 uppercase font-mono w-6">
                            {item.unit || 'un'}
                          </span>
                        </div>

                        {/* Remover */}
                        <button
                          type="button"
                          onClick={() => {
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                            setSelectedItems((prev) => {
                              const next: Record<number, boolean> = {}
                              let newIdx = 0
                              Object.keys(prev)
                                .sort((a, b) => Number(a) - Number(b))
                                .forEach((k) => {
                                  if (Number(k) !== idx) {
                                    next[newIdx] = prev[Number(k)]
                                    newIdx++
                                  }
                                })
                              return next
                            })
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                          title="Remover Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer de Ações */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetScan}
                className="gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Escanear outro
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleApply}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 font-semibold px-4 text-xs"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {syncWithPantry && selectedCount > 0
                      ? 'Salvar Gasto & Repor Despensa'
                      : 'Salvar Gasto'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
