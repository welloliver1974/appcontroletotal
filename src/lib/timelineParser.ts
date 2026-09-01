import type { TripKind, TripStop } from '@/data/types'
import { formatLocalIsoDate, todayStr } from './utils'

export interface ParsedTimelineTrip {
  destination: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  totalKm: number
  kind: TripKind
  stops: TripStop[]
  discoveredPlaces: Array<{ name: string; where: string }>
}

function parseDateAndTimeToBrasilia(input: any): { date: string; time: string } {
  if (!input) {
    return { date: todayStr(), time: '12:00' }
  }

  let d: Date
  if (typeof input === 'number') {
    d = input < 10000000000 ? new Date(input * 1000) : new Date(input)
  } else if (typeof input === 'string') {
    // If timestamp in string representation of numbers (e.g. "1710928374000")
    if (/^\d{10,13}$/.test(input.trim())) {
      const num = Number(input.trim())
      d = num < 10000000000 ? new Date(num * 1000) : new Date(num)
    } else {
      d = new Date(input)
    }
  } else {
    d = new Date()
  }

  if (Number.isNaN(d.getTime())) {
    d = new Date()
  }

  try {
    const brFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const parts = brFormatter.formatToParts(d)
    const getP = (type: string) => parts.find((p) => p.type === type)?.value || '00'

    return {
      date: `${getP('year')}-${getP('month')}-${getP('day')}`,
      time: `${getP('hour')}:${getP('minute')}`,
    }
  } catch {
    return {
      date: formatLocalIsoDate(d),
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    }
  }
}

function formatActivityType(type?: string): string {
  if (!type) return '🚗 Deslocamento'
  const t = String(type).toUpperCase()
  if (t.includes('PASSENGER_VEHICLE') || t.includes('IN_VEHICLE') || t.includes('DRIVING') || t.includes('CAR'))
    return '🚗 Deslocamento de Carro'
  if (t.includes('MOTORCYCLING') || t.includes('MOTORCYCLE')) return '🏍️ Deslocamento de Moto'
  if (t.includes('WALKING') || t.includes('ON_FOOT')) return '🚶 Caminhada'
  if (t.includes('RUNNING')) return '🏃 Corrida'
  if (t.includes('CYCLING') || t.includes('BICYCLING')) return '🚴 Ciclismo'
  if (t.includes('FLYING') || t.includes('AIR') || t.includes('FLIGHT')) return '✈️ Voo'
  if (t.includes('BUS')) return '🚌 Ônibus'
  if (t.includes('TRAIN') || t.includes('SUBWAY') || t.includes('TRAM') || t.includes('METRO'))
    return '🚆 Trem / Metrô'
  if (t.includes('FERRY') || t.includes('BOAT') || t.includes('SAILING')) return '⛴️ Barco / Balsa'
  return '🚗 Deslocamento'
}

function extractSemanticName(locationObj: any): string {
  if (!locationObj) return 'Parada'

  if (locationObj.name && typeof locationObj.name === 'string' && locationObj.name.trim()) {
    return locationObj.name.trim()
  }

  if (locationObj.address && typeof locationObj.address === 'string' && locationObj.address.trim()) {
    const parts = locationObj.address.split(',')
    return parts[0]?.trim() || locationObj.address.trim()
  }

  if (locationObj.semanticType) {
    const st = String(locationObj.semanticType).toUpperCase()
    if (st.includes('HOME')) return '🏠 Casa'
    if (st.includes('WORK')) return '💼 Trabalho'
    if (st.includes('ALIASED')) return '⭐ Local Salvo'
    if (st.includes('SEARCHED')) return '🔍 Endereço Consultado'
  }

  if (Array.isArray(locationObj.otherCandidateLocations) && locationObj.otherCandidateLocations.length > 0) {
    const cand = locationObj.otherCandidateLocations[0]
    if (cand.name) return String(cand.name).trim()
    if (cand.address) return String(cand.address).split(',')[0].trim()
  }

  if (locationObj.topCandidate?.name) {
    return String(locationObj.topCandidate.name).trim()
  }

  return 'Parada no Mapa'
}

/**
 * Parses Google Maps Timeline JSON or KML data.
 * Supports:
 * - Google Takeout (Semantic Location History / Records / Timeline Objects)
 * - Google Maps Mobile App Timeline export (visits, timelinePath, rawSignals, items)
 * - Generic GeoJSON / KML dumps
 */
export function parseGoogleTimeline(
  rawContent: string,
  preferredKind: TripKind = 'trabalho',
): ParsedTimelineTrip {
  let json: any = null

  try {
    json = JSON.parse(rawContent)
  } catch {
    return parseKmlTimeline(rawContent, preferredKind)
  }

  const rawStops: Array<{ date: string; time?: string; title: string; note?: string; address?: string }> = []
  let totalMeters = 0
  const citiesSet = new Set<string>()

  // Collect potential timeline collections from various Google JSON formats
  const candidates: any[] = []

  if (Array.isArray(json)) {
    candidates.push(...json)
  } else if (json && typeof json === 'object') {
    if (Array.isArray(json.timelineObjects)) candidates.push(...json.timelineObjects)
    if (Array.isArray(json.semanticSegments)) candidates.push(...json.semanticSegments)
    if (Array.isArray(json.items)) candidates.push(...json.items)
    if (Array.isArray(json.visits)) candidates.push(...json.visits)
    if (Array.isArray(json.locations)) candidates.push(...json.locations)
    if (Array.isArray(json.records)) candidates.push(...json.records)
    if (Array.isArray(json.points)) candidates.push(...json.points)
    if (Array.isArray(json.rawTimeline)) candidates.push(...json.rawTimeline)
    if (Array.isArray(json.segments)) candidates.push(...json.segments)
  }

  // Iterate over all candidate elements
  for (const item of candidates) {
    if (!item) continue

    // Case 1: placeVisit
    const placeVisit = item.placeVisit || (item.location && !item.activitySegment ? item : null)
    if (placeVisit) {
      const loc = placeVisit.location || placeVisit
      const name = extractSemanticName(loc)
      const address = loc.address || loc.formattedAddress || ''

      const startRaw =
        placeVisit.duration?.startTimestamp ||
        placeVisit.duration?.startTimestampMs ||
        placeVisit.duration?.startTime ||
        placeVisit.startTime ||
        placeVisit.timestamp ||
        item.timestamp

      const { date, time } = parseDateAndTimeToBrasilia(startRaw)

      if (address) {
        const parts = address.split(',')
        if (parts.length >= 2) {
          const cityCandidate = parts[parts.length - 2].trim()
          if (cityCandidate.length > 2 && !/^\d+$/.test(cityCandidate)) {
            citiesSet.add(cityCandidate)
          }
        }
      }

      rawStops.push({
        date,
        time,
        title: name,
        note: address || undefined,
        address,
      })
      continue
    }

    // Case 2: activitySegment (driving, walking, transit, flight)
    const activitySegment = item.activitySegment || (item.activity && item.distance ? item : null)
    if (activitySegment) {
      const dist = Number(activitySegment.distance) || Number(activitySegment.distanceMeters) || 0
      if (dist > 0) totalMeters += dist

      const startRaw =
        activitySegment.duration?.startTimestamp ||
        activitySegment.duration?.startTimestampMs ||
        activitySegment.duration?.startTime ||
        activitySegment.startTime ||
        activitySegment.timestamp ||
        item.timestamp

      const { date, time } = parseDateAndTimeToBrasilia(startRaw)

      const startLocName = activitySegment.startLocation?.name || activitySegment.startLocation?.address
      const endLocName = activitySegment.endLocation?.name || activitySegment.endLocation?.address
      const activityLabel = formatActivityType(activitySegment.activityType || activitySegment.type)

      const distKm = dist > 0 ? (dist / 1000).toFixed(1) : ''
      let title = activityLabel

      if (startLocName && endLocName) {
        title = `${activityLabel}: ${startLocName} ➔ ${endLocName}`
      } else if (endLocName) {
        title = `${activityLabel} em direção a ${endLocName}`
      } else if (startLocName) {
        title = `${activityLabel} a partir de ${startLocName}`
      } else if (dist > 0) {
        title = `${activityLabel} (${distKm} km)`
      }

      rawStops.push({
        date,
        time,
        title,
        note: dist > 0 ? `${distKm} km percorridos` : undefined,
      })
      continue
    }

    // Case 3: Raw location point (e.g. from Records.json or raw device export)
    if (item.latitudeE7 || item.longitudeE7 || item.timestamp || item.latLng || item.coordinates) {
      const { date, time } = parseDateAndTimeToBrasilia(item.timestamp || item.startTime)
      const name = item.name || item.address || `Ponto de Parada (${time})`

      rawStops.push({
        date,
        time,
        title: name,
        note: item.address,
      })
    }
  }

  // Deduplicate consecutive identical stops to avoid flooding
  const deduplicatedStops: typeof rawStops = []
  for (const stop of rawStops) {
    const prev = deduplicatedStops[deduplicatedStops.length - 1]
    if (!prev || prev.title !== stop.title || prev.date !== stop.date) {
      deduplicatedStops.push(stop)
    }
  }

  // Sort stops chronologically
  deduplicatedStops.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

  const currentToday = todayStr()
  const startDate = deduplicatedStops[0]?.date || currentToday
  const endDate = deduplicatedStops[deduplicatedStops.length - 1]?.date || currentToday

  // Generate day-indexed stops (1..N)
  const startTs = new Date(`${startDate}T00:00:00`).getTime()
  const stops: TripStop[] = deduplicatedStops.map((s, idx) => {
    const curTs = new Date(`${s.date}T00:00:00`).getTime()
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
  let destination = 'Viagem Linha do Tempo'
  if (citiesSet.size > 0) {
    destination = Array.from(citiesSet).slice(0, 2).join(' / ')
  } else if (stops.length > 0) {
    // Extract first meaningful non-generic stop
    const meaningful = stops.find((s) => !s.title.includes('Deslocamento') && !s.title.includes('Ponto'))
    destination = meaningful ? meaningful.title : stops[0].title
  }

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

  const currentToday = todayStr()
  const stops: TripStop[] = placemarks.slice(0, 30).map((name, i) => ({
    id: `stop-kml-${Date.now()}-${i}`,
    day: Math.floor(i / 4) + 1,
    title: name,
  }))

  return {
    destination: placemarks[0] || 'Viagem Google Maps',
    startDate: currentToday,
    endDate: currentToday,
    totalKm: 0,
    kind: preferredKind,
    stops,
    discoveredPlaces: [],
  }
}
