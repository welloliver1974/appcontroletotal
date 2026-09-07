import { useRef, useState } from 'react'
import {
  Camera,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Edit2,
  Eye,
  EyeOff,
  Key,
  Link as LinkIcon,
  Loader2,
  Plus,
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
import {
  detectQrCodeFromFile,
  formatAccessKey,
  parseAccessKey,
  parseSefazUrl,
  type SefazQrCodeData,
} from '@/lib/qrReceiptReader'
import { lookupCnpj } from '@/lib/cnpjLookup'
import { db } from '@/lib/db'
import type { PantryItem } from '@/data/types'
import { toast } from '@/stores/toastStore'
import { todayStr } from '@/lib/utils'

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

interface CapturedReceiptPhoto {
  id: string
  file: File
  compressed: CompressionResult
}

export function ReceiptScannerModal({ open, onClose, onApply }: ReceiptScannerModalProps) {
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const fullFileInputRef = useRef<HTMLInputElement>(null)

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedReceiptPhoto[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Manual URL & Access Key states
  const [showManualUrl, setShowManualUrl] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [showAccessKeyInput, setShowAccessKeyInput] = useState(false)
  const [accessKeyInput, setAccessKeyInput] = useState('')

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
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0)
  const [hasResult, setHasResult] = useState(false)

  // Apply parsed QR / Access Key result into form with asynchronous CNPJ Trade Name lookup
  const applyQrResult = async (qr: SefazQrCodeData) => {
    setQrInfo(qr)
    setErrorMsg(null)

    const initialStoreLabel = qr.cnpj ? `Nota Fiscal (CNPJ ${qr.cnpj})` : qr.model || 'Nota Fiscal SEFAZ'
    setEstablishment(initialStoreLabel)
    if (qr.totalAmount && qr.totalAmount > 0) {
      setAmountStr(qr.totalAmount.toFixed(2).replace('.', ','))
    }
    setDate(qr.date || todayStr())
    setTime('')
    setCategory('Despensa')
    setSyncWithPantry(false) // No products detected from bare QR code / access key
    setItems([])
    setSelectedItems({})
    setHasResult(true)
    toast.success(
      qr.accessKey ? 'Chave de Acesso identificada com sucesso! 🔑✨' : 'QR Code SEFAZ lido com sucesso! 🧾✨',
    )

    // Lookup CNPJ for real Trade Name / Market Name
    if (qr.cnpj) {
      try {
        const lookup = await lookupCnpj(qr.cnpj)
        if (lookup && lookup.tradeName) {
          setEstablishment(lookup.tradeName)
          toast.success(`Mercado identificado: ${lookup.tradeName} 🏪`)
        }
      } catch {
        // Keep initial store label
      }
    }
  }

  // Handle Access Key (44 digits) typing and auto-formatting
  const handleAccessKeyChange = (val: string) => {
    const formatted = formatAccessKey(val)
    setAccessKeyInput(formatted)
  }

  // Handle pasting Access Key from Clipboard
  const handlePasteAccessKey = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        const clean = text.replace(/\D/g, '')
        if (clean.length === 44) {
          const formatted = formatAccessKey(clean)
          setAccessKeyInput(formatted)
          const parsed = parseAccessKey(clean)
          if (parsed) {
            applyQrResult(parsed)
            setShowAccessKeyInput(false)
            return
          }
        } else {
          setAccessKeyInput(formatAccessKey(text))
        }
      }
    } catch {
      toast.error('Não foi possível acessar a área de transferência. Cole manualmente no campo.')
    }
  }

  // Submit Access Key manually
  const handleAccessKeySubmit = () => {
    const cleanDigits = accessKeyInput.replace(/\D/g, '')
    if (cleanDigits.length !== 44) {
      toast.error(`A Chave de Acesso precisa ter 44 dígitos (atualmente tem ${cleanDigits.length}).`)
      return
    }
    const parsed = parseAccessKey(cleanDigits)
    if (parsed) {
      applyQrResult(parsed)
      setShowAccessKeyInput(false)
    } else {
      toast.error('Chave de Acesso inválida. Verifique os números digitados.')
    }
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
        const photoItem: CapturedReceiptPhoto = {
          id: `photo-${Date.now()}`,
          file,
          compressed,
        }
        setCapturedPhotos([photoItem])
        const parsed = await parseReceiptWithVision(compressed.dataUrl, file)

        setEstablishment(parsed.establishment || 'Cupom Fiscal')
        setAmountStr(parsed.amount > 0 ? parsed.amount.toFixed(2).replace('.', ',') : '')
        setDate(parsed.date || todayStr())
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

  // 2. Adicionar Foto de Parte do Cupom (Suporte a Múltiplas Fotos)
  const handleFullReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    try {
      const compressed = await compressImageForOcr(file, 1800, 0.88)
      const newPhoto: CapturedReceiptPhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        compressed,
      }
      setCapturedPhotos((prev) => [...prev, newPhoto])
      toast.success(`Foto ${capturedPhotos.length + 1} adicionada! 📸`)
    } catch (err) {
      console.error(err)
      toast.error('Falha ao processar a imagem fotografada.')
    } finally {
      if (fullFileInputRef.current) fullFileInputRef.current.value = ''
    }
  }

  // 3. Remover uma foto capturada
  const handleRemovePhoto = (id: string) => {
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  // 4. Processar todas as fotos capturadas com a IA
  const handleProcessPhotosWithAi = async () => {
    if (capturedPhotos.length === 0) return

    setErrorMsg(null)
    setHasResult(false)
    setAnalyzing(true)
    setQrInfo(null)

    try {
      const urls = capturedPhotos.map((p) => p.compressed.dataUrl)
      const files = capturedPhotos.map((p) => p.file)

      const parsed = await parseReceiptWithVision(urls, files)

      setEstablishment(parsed.establishment || 'Cupom Fiscal')
      setAmountStr(parsed.amount > 0 ? parsed.amount.toFixed(2).replace('.', ',') : '')
      setDate(parsed.date || todayStr())
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
        capturedPhotos.length > 1
          ? `Cupom consolidado de ${capturedPhotos.length} fotos pela IA! 🧾✨`
          : parsed.qrCode
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
    }
  }

  // 5. Manual URL Submit
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
      date: date || todayStr(),
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
    setCapturedPhotos([])
    setHasResult(false)
    setErrorMsg(null)
    setItems([])
    setSelectedItems({})
    setPreviewPhotoIndex(0)
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

        {/* Hero Options Selection State (quando nenhuma foto foi tirada ainda) */}
        {capturedPhotos.length === 0 && !analyzing && !hasResult && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center bg-zinc-900/40 space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-zinc-100">
                  Como você deseja escanear o cupom?
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Tire a foto de perto do QR Code para leitura instantânea ou fotografe o cupom (mesmo se for longo, em várias partes) para a IA extrair os produtos.
                </p>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid sm:grid-cols-3 gap-3 pt-2">
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
                      Rápido ⚡
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      QR Code
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      Foto de perto do QR Code fiscal.
                    </p>
                  </div>
                </button>

                {/* Opção 2: Foto Completa com IA */}
                <button
                  type="button"
                  onClick={() => fullFileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500 text-left transition-all group flex flex-col justify-between space-y-3 shadow-lg shadow-purple-500/5"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                      Despensa 🛒
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      Foto Cupom (IA)
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      Lê itens (suporta cupons longos).
                    </p>
                  </div>
                </button>

                {/* Opção 3: Chave de Acesso (44 Dígitos) */}
                <button
                  type="button"
                  onClick={() => setShowAccessKeyInput(!showAccessKeyInput)}
                  className={`p-4 rounded-xl border text-left transition-all group flex flex-col justify-between space-y-3 shadow-lg ${
                    showAccessKeyInput
                      ? 'border-amber-500 bg-amber-500/20 shadow-amber-500/10'
                      : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500 shadow-amber-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Key className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      44 Dígitos 🔑
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      Chave de Acesso
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      Digitar ou colar os 44 números da nota.
                    </p>
                  </div>
                </button>
              </div>

              {/* Caixa de Entrada da Chave de Acesso */}
              {showAccessKeyInput && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 text-left space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" /> Chave de Consulta da Nota (44 dígitos)
                    </label>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {accessKeyInput.replace(/\D/g, '').length} / 44 dígitos
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={accessKeyInput}
                        onChange={(e) => handleAccessKeyChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAccessKeySubmit()
                        }}
                        placeholder="3524 0800 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                        className="input-base text-xs font-mono tracking-wider w-full pr-10 border-amber-500/40 focus:border-amber-400"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={handlePasteAccessKey}
                      className="text-xs gap-1 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                      title="Colar da área de transferência"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5 text-amber-400" />
                      Colar
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAccessKeySubmit}
                      disabled={accessKeyInput.replace(/\D/g, '').length !== 44}
                      className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    >
                      OK
                    </Button>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-tight">
                    💡 A chave de 44 números fica impressa logo abaixo ou acima do código de barras do cupom.
                  </p>
                </div>
              )}

              {/* Botão de Link Manual */}
              <div className="pt-1">
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

        {/* Galeria de Fotos Capturadas (quando há fotos mas ainda não foi processado com IA) */}
        {capturedPhotos.length > 0 && !analyzing && !hasResult && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border border-purple-500/30 rounded-2xl p-4 bg-zinc-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-purple-400" />
                    Fotos do Cupom ({capturedPhotos.length})
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    {capturedPhotos.length === 1
                      ? 'Cupom longo? Adicione mais fotos das outras partes antes de processar.'
                      : 'Todas as partes do cupom serão consolidadas juntas pela IA.'}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => fullFileInputRef.current?.click()}
                  className="text-xs gap-1.5 border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 text-purple-400" />
                  + Outra Parte
                </Button>
              </div>

              {/* Grid de Miniaturas das Fotos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {capturedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 aspect-[3/4] flex flex-col"
                  >
                    <img
                      src={photo.compressed.dataUrl}
                      alt={`Parte ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-purple-300 border border-purple-500/30">
                      Parte {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-500 shadow-md transition-transform active:scale-90"
                      title="Remover esta foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Botão de adicionar mais uma foto em formato de card */}
                <button
                  type="button"
                  onClick={() => fullFileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-zinc-700 hover:border-purple-500/80 bg-zinc-950/40 hover:bg-purple-500/5 aspect-[3/4] flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-purple-300 transition-all group"
                >
                  <div className="h-8 w-8 rounded-full bg-zinc-800 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                    <Plus className="h-4 w-4 text-zinc-300 group-hover:text-purple-300" />
                  </div>
                  <span className="text-xs font-semibold">Tirar + Foto</span>
                  <span className="text-[10px] text-zinc-500">Próxima parte</span>
                </button>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetScan}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Recomeçar
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleProcessPhotosWithAi}
                  className="text-xs gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/20 px-4"
                >
                  <Sparkles className="h-4 w-4" />
                  Processar com IA ({capturedPhotos.length} {capturedPhotos.length === 1 ? 'foto' : 'fotos'})
                </Button>
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
                Processando {capturedPhotos.length > 1 ? `${capturedPhotos.length} partes do cupom` : 'documento fiscal'} com IA...
              </h4>
              <p className="text-xs text-zinc-400">
                Lendo produtos, preços, quantidades e valor total.
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
              {capturedPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPhotoPreview(!showPhotoPreview)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-700/60"
                >
                  {showPhotoPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>
                    {showPhotoPreview
                      ? 'Ocultar Foto'
                      : capturedPhotos.length > 1
                        ? `Ver Fotos (${capturedPhotos.length})`
                        : 'Ver Foto do Cupom'}
                  </span>
                </button>
              )}
            </div>

            {/* Preview da Foto se expandido */}
            {showPhotoPreview && capturedPhotos.length > 0 && (
              <div className="space-y-2">
                {/* Abas se houver mais de 1 foto */}
                {capturedPhotos.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {capturedPhotos.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewPhotoIndex(idx)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all ${
                          previewPhotoIndex === idx
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Parte {idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-60 flex items-center justify-center p-1">
                  <img
                    src={
                      capturedPhotos[previewPhotoIndex]?.compressed.dataUrl ||
                      capturedPhotos[0]?.compressed.dataUrl
                    }
                    alt="Cupom Fiscal"
                    className="object-contain w-full h-full max-h-60"
                  />
                </div>
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
