import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Barcode,
  Camera,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { fetchProductByBarcode, type OpenFoodFactsProduct } from '@/lib/openFoodFacts'
import { relativeDayLabel } from '@/lib/utils'
import type { PantryItem } from '@/data/types'

interface PantryBarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onAddProduct: (item: Omit<PantryItem, 'id'>) => Promise<void>
}

const PANTRY_CATEGORIES: { id: string; label: string }[] = [
  { id: 'alimentos', label: 'Alimentos' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'laticínios', label: 'Laticínios' },
  { id: 'padaria', label: 'Padaria' },
  { id: 'carnes', label: 'Carnes' },
  { id: 'hortifruti', label: 'Hortifrúti' },
  { id: 'congelados', label: 'Congelados' },
  { id: 'limpeza', label: 'Limpeza' },
  { id: 'higiene', label: 'Higiene' },
  { id: 'outros', label: 'Outros' },
]

export function PantryBarcodeScannerModal({
  open,
  onClose,
  onAddProduct,
}: PantryBarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null)

  // Edit fields
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('alimentos')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('un')
  const [expiresAt, setExpiresAt] = useState('')
  const [lowThreshold, setLowThreshold] = useState(1)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scanIntervalRef = useRef<number | null>(null)

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopCamera()
      setProduct(null)
      setManualCode('')
      setErrorMsg(null)
      setSuccess(false)
    }
  }, [open])

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const startCamera = async () => {
    setCameraError(null)
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)

      // Start Barcode detection loop
      startScanningLoop()
    } catch (err: any) {
      console.error('[Scanner] Camera error:', err)
      setCameraError('Não foi possível acessar a câmera. Você pode digitar o código de barras abaixo.')
      setCameraActive(false)
    }
  }

  const startScanningLoop = () => {
    // Check if BarcodeDetector is available natively
    const win = window as any
    if ('BarcodeDetector' in win) {
      const detector = new win.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
      })

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const detected = barcodes[0].rawValue
            if (detected) {
              stopCamera()
              handleSearchBarcode(detected)
            }
          }
        } catch {
          // ignore detection frame errors
        }
      }, 350)
    }
  }

  const handleSearchBarcode = async (codeToSearch: string) => {
    const clean = codeToSearch.replace(/\D/g, '').trim()
    if (!clean) {
      setErrorMsg('Digite um código de barras válido.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setProduct(null)
    setSuccess(false)

    try {
      const p = await fetchProductByBarcode(clean)
      if (!p) {
        setErrorMsg(`Produto (${clean}) não encontrado na base de alimentos. Preencha os dados manualmente.`)
        setName('')
        setCategory('alimentos')
        setQty(1)
        setUnit('un')
        setExpiresAt(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10))
        setProduct({
          barcode: clean,
          name: '',
          category: 'alimentos',
          suggestedQty: 1,
          suggestedUnit: 'un',
          suggestedShelfLifeDays: 30,
          suggestedExpiryDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
        })
      } else {
        setProduct(p)
        setName(p.name)
        setCategory(p.category || 'alimentos')
        setQty(p.suggestedQty)
        setUnit(p.suggestedUnit)
        setExpiresAt(p.suggestedExpiryDate)
        setLowThreshold(1)
      }
    } catch {
      setErrorMsg('Erro ao consultar produto. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Informe o nome do produto.')
      return
    }

    setSaving(true)
    setErrorMsg(null)
    try {
      await onAddProduct({
        name: name.trim(),
        category,
        qty,
        unit,
        expiresAt: expiresAt || undefined,
        lowThreshold,
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao adicionar item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="🏷️ Scanner de Código de Barras (OpenFoodFacts)"
    >
      <div className="space-y-4 pt-1">
        {/* Visual da Câmera / Scanner */}
        {!product && (
          <div className="space-y-3">
            {cameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-indigo-500/40 shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Mirador de Scanner com linha animada */}
                <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-indigo-400/70 rounded-xl pointer-events-none flex flex-col justify-center items-center">
                  <div className="w-full h-0.5 bg-rose-500 animate-pulse shadow-lg shadow-rose-500" />
                  <span className="text-[10px] text-zinc-300 font-medium bg-black/60 px-2 py-0.5 rounded-full mt-2">
                    Posicione o código de barras
                  </span>
                </div>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-zinc-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2.5">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Barcode className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  Escaneie caixas de leite, biscoitos, refrigerantes, café e centenas de milhares de produtos nacionais.
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={startCamera}
                    className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Ligar Câmera</span>
                  </Button>
                </div>
                {cameraError && (
                  <p className="text-[11px] text-amber-400/90">{cameraError}</p>
                )}
              </div>
            )}

            {/* Inserção Manual */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSearchBarcode(manualCode)
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Ex: 7891000100103 (digite o código EAN)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="input-base pl-9 text-xs font-mono"
                />
              </div>
              <Button
                variant="soft"
                size="sm"
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="gap-1.5 shrink-0 text-xs"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>Buscar</span>
              </Button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="p-6 text-center space-y-2">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs text-zinc-400">Consultando base global de alimentos...</p>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMsg && !loading && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário com Produto Encontrado */}
        {product && !loading && (
          <div className="space-y-4 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 animate-fade-in">
            {/* Cabeçalho do Produto */}
            <div className="flex items-start gap-3 pb-3 border-b border-zinc-800">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={name}
                  className="h-16 w-16 object-contain rounded-xl bg-white/5 border border-zinc-700/50 p-1 shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="chip px-1.5 py-0 text-[10px] text-emerald-400 bg-emerald-500/15 border-emerald-500/30">
                    <Check className="h-2.5 w-2.5 inline mr-0.5" /> EAN-{product.barcode.length}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{product.barcode}</span>
                </div>
                <h4 className="text-sm font-bold text-zinc-100 mt-1 truncate">{name || 'Novo Produto'}</h4>
                {product.brand && (
                  <p className="text-xs text-zinc-400">Marca: {product.brand}</p>
                )}
              </div>
            </div>

            {/* Campos Editáveis */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Nome do Item na Despensa
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-base text-xs"
                  >
                    {PANTRY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Quantidade
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={qty}
                      onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                      className="input-base text-xs w-16 font-num"
                    />
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="un, kg"
                      className="input-base text-xs flex-1"
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Data de Validade
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="input-base text-xs"
                  />
                  {expiresAt && (
                    <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">
                      {relativeDayLabel(expiresAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProduct(null)
                  setManualCode('')
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Escanear Outro
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || success}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {success ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    <span>Salvo com Sucesso!</span>
                  </>
                ) : saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Adicionando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Adicionar à Despensa</span>
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
