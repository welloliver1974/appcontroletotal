import type { TripKind, TripStop } from '@/data/types'

export interface ParsedTimelineTrip {
  destination: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  totalKm: number
  kind: TripKind
  stops: TripStop[]
  discoveredPlaces: Array<{ name: string; where: string }>
}

/**
 * Parses Google Maps Timeline JSON or KML data.
 * Supports Google Takeout Semantic Location History, Records, or simple Timeline dumps.
 */
export function parseGoogleTimeline(
  rawContent: string,
  preferredKind: TripKind = 'trabalho',
): ParsedTimelineTrip {
  let json: any = null

  try {
    json = JSON.parse(rawContent)
  } catch {
    // If not JSON, try simple KML or text parsing
    return parseKmlTimeline(rawContent, preferredKind)
  }

  const rawStops: Array<{ date: string; time?: string; title: string; note?: string; address?: string }> = []
  let totalMeters = 0
  const citiesSet = new Set<string>()

  // 1. Check for timelineObjects (Semantic Location History from Google Takeout)
  const objects = json.timelineObjects || (Array.isArray(json) ? json : [])

  if (Array.isArray(objects) && objects.length > 0) {
    for (const item of objects) {
      // Case A: placeVisit
      if (item.placeVisit) {
        const pv = item.placeVisit
        const name = pv.location?.name || pv.location?.address || 'Parada'
        const address = pv.location?.address || ''
        const startIso = pv.duration?.startTimestamp || pv.duration?.startTimestampMs
        const d = startIso ? new Date(typeof startIso === 'number' ? startIso : startIso) : new Date()

        const dateStr = d.toISOString().slice(0, 10)
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

        if (address) {
          const parts = address.split(',')
          if (parts.length >= 2) {
            citiesSet.add(parts[parts.length - 2].trim())
          }
        }

        rawStops.push({
          date: dateStr,
          time: timeStr,
          title: name,
          note: address || undefined,
          address,
        })
      }

      // Case B: activitySegment (driving, walking, flight)
      if (item.activitySegment) {
        const seg = item.activitySegment
        const dist = Number(seg.distance) || 0
        if (dist > 0) totalMeters += dist

        const startLoc = seg.startLocation?.name || seg.startLocation?.address
        const endLoc = seg.endLocation?.name || seg.endLocation?.address

        if (startLoc || endLoc) {
          const startIso = seg.duration?.startTimestamp || seg.duration?.startTimestampMs
          const d = startIso ? new Date(typeof startIso === 'number' ? startIso : startIso) : new Date()
          const dateStr = d.toISOString().slice(0, 10)
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

          const activityType = seg.activityType || 'Deslocamento'
          const distKm = (dist / 1000).toFixed(1)

          rawStops.push({
            date: dateStr,
            time: timeStr,
            title: `🚗 ${activityType}: ${startLoc || 'Origem'} ➔ ${endLoc || 'Destino'}`,
            note: dist > 0 ? `${distKm} km rodados` : undefined,
          })
        }
      }
    }
  }

  // Fallback if generic raw coordinates or custom JSON format
  if (rawStops.length === 0 && Array.isArray(json.locations || json.points)) {
    const points = json.locations || json.points
    for (const pt of points.slice(0, 20)) {
      const d = pt.timestamp ? new Date(pt.timestamp) : new Date()
      rawStops.push({
        date: d.toISOString().slice(0, 10),
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        title: pt.name || pt.address || 'Ponto no Mapa',
        note: pt.address,
      })
    }
  }

  // Sort rawStops chronologically
  rawStops.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

  const todayStr = new Date().toISOString().slice(0, 10)
  const startDate = rawStops[0]?.date || todayStr
  const endDate = rawStops[rawStops.length - 1]?.date || todayStr

  // Generate day-indexed stops (1..N)
  const startTs = new Date(startDate).getTime()
  const stops: TripStop[] = rawStops.map((s, idx) => {
    const curTs = new Date(s.date).getTime()
    const day = Math.max(1, Math.floor((curTs - startTs) / 86_400_000) + 1)

    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stop-${Date.now()}-${idx}`,
      day,
      time: s.time,
      title: s.title,
      note: s.note,
    }
  })

  // Infer destination title
  const destination =
    citiesSet.size > 0
      ? Array.from(citiesSet).slice(0, 2).join(' / ')
      : rawStops[0]?.title || 'Viagem Importada'

  const totalKm = Math.round(totalMeters / 1000)

  const discoveredPlaces = Array.from(citiesSet).map((c) => ({
    name: c,
    where: c,
  }))

  return {
    destination,
    startDate,
    endDate,
    totalKm,
    kind: preferredKind,
    stops,
    discoveredPlaces,
  }
}

/**
 * Fallback parser for KML files (extracted from Google My Maps / Timeline).
 */
function parseKmlTimeline(kmlText: string, preferredKind: TripKind): ParsedTimelineTrip {
  const placemarks: string[] = []
  const regex = /<Placemark>([\s\S]*?)<\/Placemark>/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(kmlText)) !== null) {
    const inner = match[1]
    const nameMatch = /<name>(.*?)<\/name>/i.exec(inner)
    const name = nameMatch ? nameMatch[1].trim() : 'Parada'
    placemarks.push(name)
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const stops: TripStop[] = placemarks.slice(0, 15).map((name, i) => ({
    id: `stop-kml-${Date.now()}-${i}`,
    day: Math.floor(i / 3) + 1,
    title: name,
  }))

  return {
    destination: placemarks[0] || 'Viagem Google Maps',
    startDate: todayStr,
    endDate: todayStr,
    totalKm: 0,
    kind: preferredKind,
    stops,
    discoveredPlaces: [],
  }
}
