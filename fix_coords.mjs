import { createClient } from '@supabase/supabase-js'
const sb = createClient('https://umnpvkanmkglogjlmqro.supabase.co','sb_publishable_cGY0W3am5cnFXNoUNR1wAw_MzOBoCEQ')
const delay = ms => new Promise(r => setTimeout(r, ms))

async function nominatim(q) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ae`,
      { headers: { 'User-Agent': 'AbuDhabiClientTracker/1.0' } })
    const d = await res.json()
    if (d?.[0]) {
      const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon)
      if (lat > 22 && lat < 26.5 && lng > 51 && lng < 56.5) return { lat, lng }
    }
  } catch(e) {}
  return null
}

// Companies stacked at Mussafah (24.3419, 54.5046)
const mussafahStack = [
  { id: 3,  name: 'Eminent Interio', hint: 'Mussafah Abu Dhabi' },
  { id: 30, name: 'Royal Joinery', hint: 'Mussafah Abu Dhabi' },
  { id: 31, name: 'Fibrex Joinery', hint: 'Mussafah Abu Dhabi' },
  { id: 32, name: 'Wood Worx', hint: 'Mussafah Abu Dhabi' },
  { id: 33, name: 'Green Touch Wood Decor Works', hint: 'Mussafah Abu Dhabi' },
  { id: 34, name: 'Unique Options N Interiors (Dimension Carpentry)', hint: 'Mussafah Abu Dhabi' },
  { id: 51, name: 'Al Khalidiya Joinery', hint: 'Mussafah Abu Dhabi' },
  { id: 55, name: 'Group Three Interiors', hint: 'Mussafah Abu Dhabi' },
  { id: 59, name: 'Safeway Groups', hint: 'Mussafah Abu Dhabi' },
  { id: 61, name: 'Dr. Wood Decor', hint: 'Mussafah Abu Dhabi' },
  { id: 38, name: 'Vision Furniture & Decoration Factory', hint: 'Abu Dhabi' },
]

// Other stacked groups — add jitter
const stackedGroups = [
  [{ id: 1,  lat: 24.4672, lng: 54.3628 }, // Arcave
   { id: 9,  lat: 24.4672, lng: 54.3628 }, // Akkad
   { id: 10, lat: 24.4672, lng: 54.3628 }],// Gemaco
  [{ id: 2,  lat: 24.4948, lng: 54.3744 }, // Interspace
   { id: 57, lat: 24.4948, lng: 54.3744 }, // Winteriors
   { id: 4,  lat: 24.4948, lng: 54.3744 }],// Gensler
  [{ id: 15, lat: 24.5420, lng: 54.4350 }, // St Regis Saadiyat
   { id: 43, lat: 24.5420, lng: 54.4350 }, // Jumeirah Saadiyat
   { id: 47, lat: 24.5420, lng: 54.4350 }],// Park Hyatt Saadiyat
  [{ id: 21, lat: 24.4671, lng: 54.6076 }, // Aldar Properties
   { id: 42, lat: 24.4671, lng: 54.6076 }],// Aldar Properties PJSC
  [{ id: 23, lat: 24.4859, lng: 54.3848 }, // TAQA
   { id: 13, lat: 24.4859, lng: 54.3848 }],// Four Seasons Al Maryah
  [{ id: 54, lat: 24.4613, lng: 54.3220 }, // Alpha Dhabi
   { id: 12, lat: 24.4613, lng: 54.3220 }],// Emirates Palace
  [{ id: 35, lat: 24.4547, lng: 54.3481 }, // Mustard & Linen
   { id: 58, lat: 24.4547, lng: 54.3481 }],// Depa Interiors
]

// 1. Re-geocode Mussafah stack
console.log('=== Re-geocoding Mussafah stack ===')
const mussafahBase = { lat: 24.352, lng: 54.499 } // user's preferred Mussafah center
let resolved = []
for (const co of mussafahStack) {
  const coords = await nominatim(`${co.name} ${co.hint}`)
  await delay(1100)
  if (coords) {
    resolved.push({ id: co.id, lat: coords.lat, lng: coords.lng, src: 'nominatim' })
    console.log(`  ✓ ${co.name} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
  } else {
    resolved.push({ id: co.id, lat: null, lng: null, src: 'fallback', name: co.name })
    console.log(`  ~ ${co.name}: no match`)
  }
}

// For ones that couldn't be geocoded, spread around Mussafah industrial
const noCoords = resolved.filter(r => r.lat === null)
noCoords.forEach((r, i) => {
  const angle = (i / noCoords.length) * 2 * Math.PI
  const radius = 0.004 + (i % 3) * 0.003
  r.lat = mussafahBase.lat + radius * Math.sin(angle)
  r.lng = mussafahBase.lng + radius * Math.cos(angle)
  console.log(`  ◎ [spread] ${r.name} → ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`)
})

// Save Mussafah stack
for (const r of resolved) {
  await sb.from('companies').update({ lat: r.lat, lng: r.lng }).eq('id', r.id)
}
console.log('Mussafah stack saved.\n')

// 2. Jitter other stacked groups
console.log('=== Jittering other stacked groups ===')
for (const group of stackedGroups) {
  for (let i = 0; i < group.length; i++) {
    const r = group[i]
    const angle = (i / group.length) * 2 * Math.PI
    const jitter = 0.0015
    const lat = r.lat + jitter * Math.sin(angle)
    const lng = r.lng + jitter * Math.cos(angle)
    await sb.from('companies').update({ lat, lng }).eq('id', r.id)
    console.log(`  [${r.id}] → ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
  }
}
console.log('\nAll done.')
