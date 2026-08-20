import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X, Zap } from 'lucide-react'
import jsQR from 'jsqr'
import { parseSefazUrl, type SefazQrCodeData } from '@/lib/qrReceiptReader'
import { Button } from '@/components/ui/Button'

interface LiveQrScannerProps {
  onScan: (data: SefazQrCodeData) => void
  onClose: () => void
}

export function LiveQrScanner({ onScan, onClose }: LiveQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  // Start Camera Stream
  useEffect(() => {
    let active = true

    const startCamera = async () => {
      try {
        setCameraError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        setHasPermission(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play().catch(() => {})
        }

        // Check if torch/flashlight is supported
        const track = stream.getVideoTracks()[0]
        const capabilities = track.getCapabilities?.() as any
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true)
        }
      } catch (err: any) {
        console.error('[LiveQrScanner] Camera error:', err)
        if (active) {
          setHasPermission(false)
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Acesso à câmera negado. Conceda permissão nas configurações do navegador.'
              : 'Não foi possível acessar a câmera do aparelho.',
          )
        }
      }
    }

    startCamera()

    return () => {
      active = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Toggle Torch (Flash)
  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (track && 'applyConstraints' in track) {
      try {
        const nextState = !torchOn
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        })
        setTorchOn(nextState)
      } catch (err) {
        console.warn('Falha ao ligar lanterna:', err)
      }
    }
  }

  // Continuous Frame Analysis Loop
  useEffect(() => {
    if (!hasPermission) return

    let scanning = true
    let barcodeDetector: any = null

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      } catch {
        barcodeDetector = null
      }
    }

    const scanFrame = async () => {
      if (!scanning) return

      const video = videoRef.current
      const canvas = canvasRef.current

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const width = video.videoWidth
        const height = video.videoHeight

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height)

          // 1. Try Native BarcodeDetector (instant C++)
          let detectedUrl: string | null = null

          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(canvas)
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedUrl = barcodes[0].rawValue
              }
            } catch {
              // Fallback to jsQR
            }
          }

          // 2. Fallback to jsQR
          if (!detectedUrl) {
            const imgData = ctx.getImageData(0, 0, width, height)
            const qr = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            })
            if (qr && qr.data) {
              detectedUrl = qr.data
            }
          }

          if (detectedUrl) {
            const parsed = parseSefazUrl(detectedUrl)
            if (parsed) {
              // Trigger haptic vibration feedback
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([80, 40, 80])
              }

              scanning = false
              onScan(parsed)
              return
            }
          }
        }
      }

      if (scanning) {
        animFrameRef.current = requestAnimationFrame(scanFrame)
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame)

    return () => {
      scanning = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [hasPermission, onScan])

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 flex flex-col items-center justify-center min-h-[320px] max-h-[420px] shadow-2xl">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover max-h-[420px]"
        playsInline
        autoPlay
        muted
      />

      {/* Scanner Reticle Overlay */}
      {hasPermission && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 bg-black/30 backdrop-blur-[1px]">
          {/* Target Box */}
          <div className="relative w-60 h-60 border-2 border-emerald-500/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
            {/* Laser scanning line animation */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_10px_#10b981] top-1/2 -translate-y-1/2" />

            {/* Corner Markers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />
          </div>

          <div className="mt-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur border border-zinc-700/80 text-white text-xs font-medium tracking-wide flex items-center gap-1.5 shadow-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Aponte a câmera para o QR Code da nota
          </div>
        </div>
      )}

      {/* Top Floating Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        {hasTorch && (
          <button
            type="button"
            onClick={toggleTorch}
            className={`p-2 rounded-full backdrop-blur-md border transition-all ${
              torchOn
                ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-black/60 text-zinc-200 border-zinc-700 hover:bg-black/80'
            }`}
            title="Ligar Lanterna"
          >
            <Zap className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-zinc-700 text-zinc-200 hover:bg-black/80 transition-colors"
          title="Fechar Câmera"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Permission / Error State */}
      {cameraError && (
        <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
          <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Camera className="h-6 w-6" />
          </div>
          <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">{cameraError}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs border-zinc-700 text-zinc-300"
          >
            Voltar para opções
          </Button>
        </div>
      )}

      {/* Initial Loading */}
      {hasPermission === null && !cameraError && (
        <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center space-y-2 z-20">
          <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
          <p className="text-xs text-zinc-400">Iniciando câmera ao vivo...</p>
        </div>
      )}
    </div>
  )
}
