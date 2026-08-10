// Round 2: extract coords from Google Maps URLs (36 companies have these)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://umnpvkanmkglogjlmqro.supabase.co',
  'sb_publishable_cGY0W3am5cnFXNoUNR1wAw_MzOBoCEQ'
)

function extractCoords(url) {
  if (!url) return null
  const md = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (md) return { lat: parseFloat(md[1]), lng: parseFloat(md[2]) }
  const mc = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (mc) return { lat: parseFloat(mc[1]), lng: parseFloat(mc[2]) }
  for (const p of [/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/]) {
    const m = url.match(p); if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  }
  return null
}

// District fallback table
const DIST = {
  "mussafah":[24.3419,54.5046],"musaffah":[24.3419,54.5046],
  "al danah":[24.4672,54.3628],"al zahiyah":[24.4948,54.3744],"tourist club":[24.4948,54.3744],
  "corniche":[24.4613,54.3220],"al bateen":[24.4430,54.3201],"khalidiyah":[24.4547,54.3481],
  "al khalidiyah":[24.4547,54.3481],"al karamah":[24.4680,54.3540],"al mushrif":[24.4367,54.3891],
  "hamdan":[24.4760,54.3660],"hamdan street":[24.4760,54.3660],
  "airport road":[24.4400,54.4000],"salam street":[24.4830,54.3700],
  "al nasr":[24.4550,54.3950],"madinat zayed":[24.4580,54.3380],"al marina":[24.4632,54.3170],
  "al reem":[24.4987,54.4024],"reem island":[24.4987,54.4024],
  "al maryah":[24.4859,54.3848],"sowwah":[24.4859,54.3848],
  "saadiyat":[24.5420,54.4350],"yas island":[24.4671,54.6076],
  "khalifa city":[24.3992,54.5367],
  "al raha":[24.3795,54.5897],"al raha beach":[24.3795,54.5897],
  "mbz city":[24.4287,54.5619],"mohammed bin zayed":[24.4287,54.5619],
  "icad":[24.3311,54.5250],"khalifa industrial":[24.3311,54.5250],
  "baniyas":[24.3227,54.6373],"al ain":[24.2075,55.7447],
}

function distCoords(text) {
  if (!text) return null
  const t = text.toLowerCase()
  for (const [k, v] of Object.entries(DIST)) {
    if (t.includes(k)) return { lat: v[0], lng: v[1] }
  }
  return null
}

const { data: companies } = await supabase
  .from('companies')
  .select('id, name, address, notes, maps')
  .is('lat', null)

console.log(`${companies.length} still without coordinates`)
let saved = 0

for (const co of companies) {
  // Try maps URL extraction
  const fromMaps = extractCoords(co.maps)
  // Try district keywords from address then notes
  const fromDist = distCoords(co.address) || distCoords(co.notes)
  
  const coords = fromMaps || fromDist
  if (coords) {
    const src = fromMaps ? 'maps-url' : 'district'
    const { error } = await supabase
      .from('companies')
      .update({ lat: coords.lat, lng: coords.lng })
      .eq('id', co.id)
    if (!error) { console.log(`  ✓ [${src}] ${co.name} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`); saved++ }
  } else {
    console.log(`  ~ ${co.name} (address: ${co.address}) — no coords`)
  }
}

// Apply Abu Dhabi city centre default to remaining nulls
const { data: still } = await supabase.from('companies').select('id,name').is('lat',null)
console.log(`\n${saved} more saved. Still null: ${still?.length}`)
if (still?.length) {
  // Spread them around Abu Dhabi city centre with jitter so they don't overlap
  for (let i = 0; i < still.length; i++) {
    const co = still[i]
    const angle = (i / still.length) * 2 * Math.PI
    const r = 0.012 + (i % 3) * 0.006
    const lat = 24.4539 + r * Math.sin(angle)
    const lng = 54.3773 + r * Math.cos(angle)
    await supabase.from('companies').update({ lat, lng }).eq('id', co.id)
    console.log(`  ◎ [spread] ${co.name}`)
  }
}
