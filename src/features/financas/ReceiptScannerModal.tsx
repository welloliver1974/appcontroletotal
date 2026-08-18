import { useRef, useState } from 'react'
import {
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  Receipt,
  RotateCcw,
  Zap,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { compressImageForOcr, type CompressionResult } from '@/lib/imageCompressor'
import { parseReceiptWithVision, type ParsedReceiptData } from '@/lib/receiptScanner'
import { toast } from '@/stores/toastStore'

interface ReceiptScannerModalProps {
  open: boolean
  onClose: () => void
  onApply: (data: ParsedReceiptData) => void
}

export function ReceiptScannerModal({ open, onClose, onApply }: ReceiptScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [compressResult, setCompressResult] = useState<CompressionResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    setParsedData(null)
    setAnalyzing(true)

    try {
      // 1. Client-side image compression (saves 98% tokens/bandwidth)
      const compressed = await compressImageForOcr(file, 900, 0.7)
      setCompressResult(compressed)

      // 2. Vision OCR Analysis
      const parsed = await parseReceiptWithVision(compressed.dataUrl)
      setParsedData(parsed)
      toast.success('Cupom lido com sucesso pela IA! 🧾')
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Falha ao analisar o cupom.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApply = () => {
    if (!parsedData) return
    onApply(parsedData)
    onClose()
  }

  const resetScan = () => {
    setCompressResult(null)
    setParsedData(null)
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Modal open={open} onClose={onClose} title="Scanner de Cupom Fiscal com IA 📸">
      <div className="space-y-4 pt-1">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!compressResult && !analyzing && (
          <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center transition-all bg-zinc-900/40 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Camera className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-100">
                Tire uma foto ou envie a imagem do Cupom
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                A IA lerá o nome do supermercado, data, categoria e valor total automaticamente.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              >
                <Camera className="h-4 w-4" /> Tirar Foto / Galeria
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400/90 pt-1">
              <Zap className="h-3.5 w-3.5" />
              <span>Compressão automática ativada (Economiza tokens no Free Tier)</span>
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
                Lendo dados do cupom fiscal...
              </h4>
              <p className="text-xs text-zinc-400">
                Identificando valor total, estabelecimento e data da compra.
              </p>
            </div>

            {compressResult && (
              <span className="chip px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                ⚡ Imagem comprimida: {compressResult.originalSizeKb} KB ➔ {compressResult.compressedSizeKb} KB (-{compressResult.compressionRatio}%)
              </span>
            )}
          </div>
        )}

        {/* Erro State */}
        {errorMsg && !analyzing && (
          <div className="border border-rose-500/30 bg-rose-500/10 rounded-2xl p-4 space-y-2 text-center">
            <p className="text-xs font-semibold text-rose-300">{errorMsg}</p>
            <Button variant="ghost" size="sm" onClick={resetScan} className="gap-1.5 text-xs text-zinc-300">
              <RotateCcw className="h-3.5 w-3.5" /> Tentar outra foto
            </Button>
          </div>
        )}

        {/* Resultado Encontrado */}
        {parsedData && !analyzing && (
          <div className="space-y-3">
            {/* Foto e Card de Dados */}
            <div className="grid sm:grid-cols-3 gap-3">
              {/* Preview da Imagem */}
              {compressResult && (
                <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-[3/4] max-h-48 sm:max-h-none flex items-center justify-center">
                  <img
                    src={compressResult.dataUrl}
                    alt="Cupom"
                    className="object-cover w-full h-full opacity-80"
                  />
                  <span className="absolute bottom-1 right-1 chip px-1.5 py-0.5 text-[9px] bg-black/80 text-emerald-400 border-emerald-500/30">
                    {compressResult.compressedSizeKb} KB
                  </span>
                </div>
              )}

              {/* Informações Extraídas */}
              <div className="sm:col-span-2 space-y-2.5 bg-zinc-900/80 border border-emerald-500/30 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Dados Identificados
                  </span>
                  <span className="chip px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                    {parsedData.category}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400 block">Estabelecimento:</span>
                  <p className="text-sm font-bold text-zinc-100">{parsedData.establishment}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Valor Total:</span>
                    <p className="font-display font-num text-lg font-bold text-emerald-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        parsedData.amount,
                      )}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 block">Data e Hora:</span>
                    <p className="text-xs font-mono font-medium text-zinc-200">
                      {parsedData.date} {parsedData.time && `às ${parsedData.time}`}
                    </p>
                  </div>
                </div>

                {parsedData.items && parsedData.items.length > 0 && (
                  <div className="pt-1.5 border-t border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block mb-1">
                      Itens identificados ({parsedData.items.length}):
                    </span>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">
                      {parsedData.items.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={resetScan} className="gap-1 text-xs">
                <RotateCcw className="h-3 w-3" /> Outra foto
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleApply}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
              >
                <Check className="h-4 w-4" /> Preencher Gasto
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
