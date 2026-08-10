import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://umnpvkanmkglogjlmqro.supabase.co'
const SUPABASE_KEY = 'sb_publishable_cGY0W3am5cnFXNoUNR1wAw_MzOBoCEQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const delay = ms => new Promise(r => setTimeout(r, ms))

async function nominatim(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ae`
    const res = await fetch(url, { headers: { 'User-Agent': 'AbuDhabiClientTracker/1.0 geocoder' } })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.[0]) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      if (lat > 22 && lat < 26.5 && lng > 51 && lng < 56.5) return { lat, lng }
    }
  } catch(e) { console.log('  fetch error:', e.message) }
  return null
}

const { data: companies, error } = await supabase
  .from('companies')
  .select('id, name, address, notes')
  .is('lat', null)

if (error) { console.error('DB error:', error); process.exit(1) }
console.log(`Found ${companies.length} companies without coordinates\n`)

let ok = 0, failed = 0

for (const co of companies) {
  let coords = await nominatim(`${co.name} Abu Dhabi UAE`)
  await delay(1100)

  if (!coords && co.address && co.address !== 'Abu Dhabi') {
    coords = await nominatim(`${co.address} Abu Dhabi UAE`)
    await delay(1100)
  }

  if (coords) {
    const { error: ue } = await supabase
      .from('companies')
      .update({ lat: coords.lat, lng: coords.lng })
      .eq('id', co.id)
    if (ue) { console.log(`  ✗ ${co.name}: DB error ${ue.message}`); failed++ }
    else { console.log(`  ✓ ${co.name} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`); ok++ }
  } else {
    console.log(`  ~ ${co.name}: no geocode match`); failed++
  }
}

console.log(`\nResult: ${ok} saved, ${failed} not found`)
