import { createClient } from '@supabase/supabase-js'
const sb = createClient('https://umnpvkanmkglogjlmqro.supabase.co','sb_publishable_cGY0W3am5cnFXNoUNR1wAw_MzOBoCEQ')

const {data:vision} = await sb.from('companies').select('id,name,address,maps,website,lat,lng').or('name.ilike.%vision%,name.ilike.%royal%').order('name')
console.log('\n=== %vision% OR %royal% ===')
vision?.forEach(r=>console.log(`[${r.id}] ${r.name}\n  address: ${r.address}\n  maps: ${r.maps||'null'}\n  lat: ${r.lat}, lng: ${r.lng}`))

const {data:all} = await sb.from('companies').select('id,name,address,lat,lng').order('name')
console.log('\n=== ALL COMPANIES lat/lng ===')
all?.forEach(r=>console.log(`[${r.id}] ${r.name} | ${r.address} | lat:${r.lat?.toFixed(4)??'NULL'} lng:${r.lng?.toFixed(4)??'NULL'}`))
