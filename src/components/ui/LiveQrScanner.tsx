import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X, Zap, ZoomIn } from 'lucide-react'
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
  const [zoomLevel, setZoomLevel] = useState(1)
  const [hasZoom, setHasZoom] = useState(false)
  const [maxZoom, setMaxZoom] = useState(3)

  // Start Full HD Camera Stream with Macro Focus
  useEffect(() => {
    let active = true

    const startCamera = async () => {
      try {
        setCameraError(null)

        // Request Full HD 1080p/4K resolution for razor-sharp QR readability
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { min: 1280, ideal: 1920, max: 3840 },
            height: { min: 720, ideal: 1080, max: 2160 },
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

        // Apply macro continuous autofocus & check capabilities
        const track = stream.getVideoTracks()[0]
        if (track) {
          try {
            await (track as any).applyConstraints?.({
              advanced: [
                { focusMode: 'continuous' },
                { exposureMode: 'continuous' },
                { whiteBalanceMode: 'continuous' },
              ],
            })
          } catch {
            // Ignore if advanced focus constraints are not supported on this specific lens
          }

          const capabilities = track.getCapabilities?.() as any
          if (capabilities) {
            if ('torch' in capabilities) setHasTorch(true)
            if ('zoom' in capabilities) {
              setHasZoom(true)
              setMaxZoom(Math.min(capabilities.zoom.max || 3, 5))
            }
          }
        }
      } catch (err: any) {
        console.error('[LiveQrScanner] Camera error:', err)
        if (active) {
          setHasPermission(false)
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Acesso à câmera negado. Conceda permissão nas configurações do navegador.'
              : 'Não foi possível acessar a câmera em alta resolução.',
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

  // Toggle Zoom Level (1x -> 2x -> 3x -> 1x)
  const cycleZoom = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (track && 'applyConstraints' in track) {
      try {
        let nextZoom = zoomLevel + 1
        if (nextZoom > maxZoom || nextZoom > 3) nextZoom = 1
        await (track as any).applyConstraints({
          advanced: [{ zoom: nextZoom }],
        })
        setZoomLevel(nextZoom)
      } catch (err) {
        console.warn('Falha ao aplicar zoom:', err)
      }
    }
  }

  // Tap-to-Focus trigger
  const handleTapToFocus = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (track && 'applyConstraints' in track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ focusMode: 'continuous' }],
        })
      } catch {}
    }
  }

  // Continuous High-Speed Frame Analysis Loop
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

        // Set canvas resolution for detection (capped at 1080p for performance)
        const scale = Math.min(1, 1080 / Math.max(width, height))
        canvas.width = Math.round(width * scale)
        canvas.height = Math.round(height * scale)

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

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

          // 2. Fallback to jsQR on center crop (focus box region)
          if (!detectedUrl) {
            // Target the center 60% of the canvas where the user points the QR code
            const cropSize = Math.round(Math.min(canvas.width, canvas.height) * 0.7)
            const cropX = Math.round((canvas.width - cropSize) / 2)
            const cropY = Math.round((canvas.height - cropSize) / 2)

            const imgData = ctx.getImageData(cropX, cropY, cropSize, cropSize)
            const qr = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            })

            if (qr && qr.data) {
              detectedUrl = qr.data
            } else {
              // Fallback to full frame jsQR
              const fullImgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const fullQr = jsQR(fullImgData.data, fullImgData.width, fullImgData.height, {
                inversionAttempts: 'dontInvert',
              })
              if (fullQr && fullQr.data) {
                detectedUrl = fullQr.data
              }
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
    <div
      onClick={handleTapToFocus}
      className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 flex flex-col items-center justify-center min-h-[360px] max-h-[460px] shadow-2xl cursor-pointer select-none"
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Full Resolution Video Feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover min-h-[360px] max-h-[460px]"
        playsInline
        autoPlay
        muted
      />

      {/* Scanner Reticle Overlay */}
      {hasPermission && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 bg-black/20 backdrop-blur-[0.5px]">
          {/* Target Box (Center Target for Small QRs) */}
          <div className="relative w-64 h-64 border-2 border-emerald-400 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center overflow-hidden">
            {/* Laser scanning line animation */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent animate-pulse shadow-[0_0_12px_#34d399] top-1/2 -translate-y-1/2" />

            {/* Corner Markers */}
            <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-3 border-l-3 border-emerald-300 rounded-tl-lg" />
            <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-3 border-r-3 border-emerald-300 rounded-tr-lg" />
            <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-3 border-l-3 border-emerald-300 rounded-bl-lg" />
            <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-3 border-r-3 border-emerald-300 rounded-br-lg" />
          </div>

          <div className="mt-4 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur border border-zinc-700 text-white text-xs font-semibold tracking-wide flex items-center gap-2 shadow-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Aproxime o QR Code dentro do quadrado
          </div>
        </div>
      )}

      {/* Floating Controls (Torch, Zoom, Close) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        {hasZoom && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              cycleZoom()
            }}
            className="px-2.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-zinc-700 text-zinc-100 hover:bg-black/90 text-xs font-bold flex items-center gap-1 shadow-lg transition-all"
            title="Ajustar Zoom"
          >
            <ZoomIn className="h-3.5 w-3.5 text-emerald-400" />
            <span>{zoomLevel}x</span>
          </button>
        )}

        {hasTorch && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleTorch()
            }}
            className={`p-2 rounded-full backdrop-blur-md border transition-all shadow-lg ${
              torchOn
                ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/20'
                : 'bg-black/70 text-zinc-200 border-zinc-700 hover:bg-black/90'
            }`}
            title="Ligar Lanterna"
          >
            <Zap className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-zinc-700 text-zinc-200 hover:bg-black/90 transition-colors shadow-lg"
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
            variant="soft"
            size="sm"
            onClick={onClose}
            className="text-xs border border-zinc-700 text-zinc-300"
          >
            Voltar para opções
          </Button>
        </div>
      )}

      {/* Initial Loading */}
      {hasPermission === null && !cameraError && (
        <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center space-y-2 z-20">
          <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
          <p className="text-xs text-zinc-400">Iniciando câmera Full HD em alta definição...</p>
        </div>
      )}
    </div>
  )
}
