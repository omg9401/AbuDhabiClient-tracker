import{useState,useEffect,useCallback,useRef}from"react"
import{MapContainer,TileLayer,Marker,Popup}from"react-leaflet"
import{useMap}from"react-leaflet"
import L from"leaflet"
import"leaflet/dist/leaflet.css"
import*as XLSX from"xlsx"
import{supabase}from"./lib/supabase"

type Co={id:number;name:string;category:string;address:string;website:string;maps:string;procurement_email:string;office_phone:string;procurement_officer:string;notes:string;physical_meeting_1:boolean;call_1:boolean;call_2:boolean;call_3:boolean;physical_meeting_2:boolean;status:string|null;assigned_to:string|null;added_date:string;meet_count:number|null;last_met_at:string|null;lat:number|null;lng:number|null}
type Pend={id:number;name:string;category:string;address:string;city:string;website:string|null;maps:string|null;procurement_email:string;office_phone:string;procurement_officer:string;notes:string;added_date:string}
type Contact={id:number;company_id:number;type:"email"|"phone";label:string;value:string;created_at:string}
type Sett={categories:string[];emirates:string[];assignees:string[]}
const DC=["Interior Companies","Design Companies","Consultants","Hotels","Holding Companies","Royal HH Offices","FF&E Buying Companies","Joinery Companies"]
const DE=["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"]
const DA=["Majen","Aashel"]
const E0={name:"",category:DC[0],address:DE[0],procurement_email:"",office_phone:"",procurement_officer:"",notes:"",assigned_to:"",website:"",maps:""}
const ST=[{v:"onboarded",l:"Onboarded",b:"#16A34A",lc:"#DCFCE7"},{v:"great",l:"Great Fit",b:"#2563EB",lc:"#DBEAFE"},{v:"yellow",l:"Follow Up",b:"#D97706",lc:"#FEF3C7"},{v:"red",l:"Not a Fit",b:"#DC2626",lc:"#FEE2E2"},{v:"black",l:"Do Not Contact",b:"#1E293B",lc:"#F1F5F9"},{v:"nopay",l:"Doesn't Pay",b:"#B91C1C",lc:"#FEE2E2"}]
const SM:Record<string,typeof ST[0]>=Object.fromEntries(ST.map(s=>[s.v,s]))
const CB=["physical_meeting_1","call_1","call_2","call_3","physical_meeting_2"]
const CBL=["Meet1","Call1","Call2","Call3","Meet2"]
const CAT_CLR:Record<string,string>={"Interior Companies":"#7C3AED","Design Companies":"#2563EB","Consultants":"#0891B2","Hotels":"#D97706","Holding Companies":"#16A34A","Royal HH Offices":"#DC2626","FF&E Buying Companies":"#9333EA","Joinery Companies":"#EA580C"}
const DIST:Record<string,[number,number]>={
  // Mussafah industrial zones
  "mussafah":[24.3419,54.5046],"musaffah":[24.3419,54.5046],"mussafah industrial":[24.3366,54.4945],
  "mw5":[24.3390,54.5014],"mw6":[24.3375,54.5028],"mw10":[24.3420,54.5060],"mw11":[24.3430,54.5070],
  "icad":[24.3311,54.5250],"khalifa industrial":[24.3311,54.5250],
  // City centre districts
  "al danah":[24.4672,54.3628],"al zahiyah":[24.4948,54.3744],"tourist club":[24.4948,54.3744],
  "corniche":[24.4613,54.3220],"al bateen":[24.4430,54.3201],"khalidiyah":[24.4547,54.3481],
  "al khalidiyah":[24.4547,54.3481],"al karamah":[24.4680,54.3540],"al mushrif":[24.4367,54.3891],
  "al rawdah":[24.4690,54.3760],"al muntazah":[24.4530,54.3800],"al manhal":[24.4700,54.3700],
  "al markaziyah":[24.4870,54.3650],"central":[24.4870,54.3650],
  "hamdan":[24.4760,54.3660],"hamdan street":[24.4760,54.3660],
  "airport road":[24.4400,54.4000],"salam street":[24.4830,54.3700],
  "electra":[24.4880,54.3720],"electra street":[24.4880,54.3720],
  "al nasr":[24.4550,54.3950],"al noor":[24.4560,54.3700],
  "madinat zayed":[24.4580,54.3380],"al marina":[24.4632,54.3170],"al bateen airport":[24.4285,54.4590],
  "rabdan":[24.4200,54.3900],"al rabdan":[24.4200,54.3900],
  // Islands & waterfront
  "al reem":[24.4987,54.4024],"reem island":[24.4987,54.4024],"al reem island":[24.4987,54.4024],
  "al maryah":[24.4859,54.3848],"al maryah island":[24.4859,54.3848],"sowwah":[24.4859,54.3848],
  "saadiyat":[24.5420,54.4350],"saadiyat island":[24.5420,54.4350],"louvre":[24.5338,54.3982],
  "yas island":[24.4671,54.6076],"yas":[24.4671,54.6076],"ferrari world":[24.4837,54.6074],
  "al lulu":[24.4713,54.3455],"lulu island":[24.4713,54.3455],
  // Suburbs & outlying
  "khalifa city":[24.3992,54.5367],"khalifa city a":[24.3992,54.5367],
  "al raha":[24.3795,54.5897],"al raha beach":[24.3795,54.5897],
  "shahama":[24.3060,54.5320],"al shahama":[24.3060,54.5320],
  "baniyas":[24.3227,54.6373],"al bahia":[24.3750,54.5670],
  "mbz city":[24.4287,54.5619],"mohammed bin zayed":[24.4287,54.5619],
  "shakhbout":[24.3500,54.5800],"al falah":[24.2750,54.5500],
  "al samha":[24.3900,54.5800],"mafraq":[24.2790,54.5900],
  // Al Ain
  "al ain":[24.2075,55.7447],"al jimi":[24.2266,55.7425],"al muwaiji":[24.2100,55.7300],
  "al khrair":[24.0911,55.7483]
}
const IS=typeof window!=="undefined"&&sessionStorage.getItem("auth")==="1"
const inp=(extra?:any)=>({width:"100%",padding:"9px 12px",border:"1px solid #CBD5E1",borderRadius:"8px",fontSize:"14px",color:"#1E293B",background:"#fff",boxSizing:"border-box" as const,marginBottom:"10px",...extra})
const btnS=(bg:string,c="white",p="10px 18px")=>({background:bg,color:c,border:"none",borderRadius:"8px",padding:p,cursor:"pointer",fontWeight:"600",fontSize:"13px"} as const)

const href=(u:string|null)=>!u||!u.trim()?null:u.startsWith("http")?u:"https://"+u.trim()
function extractCoords(url:string|null):[number,number]|null{
  if(!url)return null
  // Most precise: pin location embedded in data parameter  (e.g. !3d24.4539!4d54.3773)
  const md=url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if(md)return[parseFloat(md[1]),parseFloat(md[2])]
  // Map centre from share URL  (/@lat,lng,zoom)
  const mc=url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if(mc)return[parseFloat(mc[1]),parseFloat(mc[2])]
  // ?ll=  ?q=  ?daddr=  patterns
  for(const p of[/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,/[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/]){
    const m=url.match(p);if(m)return[parseFloat(m[1]),parseFloat(m[2])]
  }
  return null
}
function distCoords(text:string|null):[number,number]|null{
  if(!text)return null
  const t=text.toLowerCase()
  for(const[k,v]of Object.entries(DIST)){if(t.includes(k))return v}
  return null
}
function getCoords(c:Co):[number,number]{
  return extractCoords(c.maps)||distCoords(c.notes)||distCoords(c.address)||[24.4539+(Math.random()-.5)*.02,54.3773+(Math.random()-.5)*.02]
}
function mkIcon(cat:string){
  const col=CAT_CLR[cat]||"#64748B"
  return L.divIcon({
    html:`<div style="width:16px;height:16px;border-radius:50%;background:${col};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.45);transform:translate(-50%,-50%)"></div>`,
    className:"",iconSize:[1,1],iconAnchor:[0,0],popupAnchor:[8,-8]
  })
}

function FitAll({coords}:{coords:[number,number][]}){
  const map=useMap()
  useEffect(()=>{if(coords.length>0)map.fitBounds(coords as any,{padding:[48,48],maxZoom:14})},[])
  return null
}

function FlyTo({target}:{target:[number,number]|null}){
  const map=useMap()
  useEffect(()=>{if(target)map.flyTo(target,15,{duration:1.5})},[target])
  return null
}

function MapView({rows,mobile}:{rows:Co[];mobile:boolean}){
  const[userPos,setUserPos]=useState<[number,number]|null>(null)
  const[flyTarget,setFlyTarget]=useState<[number,number]|null>(null)
  const[locating,setLocating]=useState(false)
  const[locErr,setLocErr]=useState<string|null>(null)

  // Use lat/lng from DB — no runtime geocoding
  const placed=[...new Map(rows.map(r=>[r.id,r])).values()]
    .map(r=>{
      const coords:([number,number]|null)=
        r.lat!=null&&r.lng!=null?[r.lat,r.lng]:
        extractCoords(r.maps)||distCoords(r.notes)||distCoords(r.address)||null
      return coords?{...r,coords}:null
    }).filter(Boolean) as (Co&{coords:[number,number]})[]
  
  const allCoords=placed.map(r=>r.coords)


  const locate=()=>{
    if(!navigator.geolocation){setLocErr("GPS not supported");return}
    setLocating(true);setLocErr(null)
    navigator.geolocation.getCurrentPosition(
      pos=>{const c:[number,number]=[pos.coords.latitude,pos.coords.longitude];setUserPos(c);setFlyTarget(c);setLocating(false)},
      err=>{setLocating(false);setLocErr(err.code===1?"Location access denied":"Could not get location");setTimeout(()=>setLocErr(null),3500)},
      {timeout:10000,enableHighAccuracy:true}
    )
  }

  const userIcon=L.divIcon({html:`<div style="width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,.25),0 2px 8px rgba(0,0,0,.3);transform:translate(-50%,-50%)"></div>`,className:"",iconSize:[1,1],iconAnchor:[0,0],popupAnchor:[10,-10]})

  const mapH=mobile?"calc(100dvh - 130px)":"calc(100dvh - 58px)"

  return(
    <div style={{position:"relative",height:mapH,width:"100%"}}>
      {/* Top pill */}
      <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",zIndex:999,background:"rgba(255,255,255,.95)",borderRadius:"24px",padding:"6px 16px",fontSize:"12px",color:"#64748B",boxShadow:"0 2px 8px rgba(0,0,0,.12)",whiteSpace:"nowrap",pointerEvents:"none"}}>
        {rows.length} companies · {placed.length} mapped
      </div>

      {/* Locate Me button */}
      <button onClick={locate} disabled={locating} style={{position:"absolute",top:12,right:12,zIndex:999,background:"#fff",border:"none",borderRadius:"12px",padding:"10px 14px",cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,.18)",fontSize:"13px",fontWeight:"700",color:locating?"#94A3B8":"#1E293B",display:"flex",alignItems:"center",gap:"6px"}}>
        {locating?"⏳":"📍"}{!mobile&&(locating?" Locating…":" Locate Me")}
      </button>

      {/* Error toast */}
      {locErr&&<div style={{position:"absolute",top:60,right:12,zIndex:999,background:"#FEF2F2",color:"#DC2626",borderRadius:"10px",padding:"8px 14px",fontSize:"12px",fontWeight:"600",boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}>{locErr}</div>}

      {/* Category legend */}
      <div style={{position:"absolute",bottom:mobile?32:24,left:12,zIndex:999,background:"rgba(255,255,255,.95)",borderRadius:"12px",padding:"10px 14px",fontSize:"11px",boxShadow:"0 2px 8px rgba(0,0,0,.12)",maxHeight:"40vh",overflowY:"auto"}}>
        {Object.entries(CAT_CLR).map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"4px"}}>
            <div style={{width:12,height:12,borderRadius:"50%",background:v,flexShrink:0,border:"2px solid white",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
            <span style={{color:"#1E293B",fontWeight:"500"}}>{k}</span>
          </div>
        ))}
        
      </div>

      <MapContainer center={[24.4539,54.3773]} zoom={12} style={{width:"100%",height:"100%"}} zoomControl={!mobile}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"/>
        <FitAll coords={allCoords}/>
        <FlyTo target={flyTarget}/>
        <>
          {placed.map(r=>(
            <Marker key={r.id} position={r.coords} icon={mkIcon(r.category)}>
              <Popup maxWidth={290} autoPan={true}>
                <div style={{fontFamily:"system-ui,sans-serif",minWidth:"230px"}}>
                  <div style={{fontWeight:"700",fontSize:"15px",color:"#1E293B",marginBottom:"6px",lineHeight:"1.3"}}>{r.name}</div>
                  <div style={{display:"flex",gap:"6px",marginBottom:"10px",flexWrap:"wrap"}}>
                    <span style={{background:CAT_CLR[r.category]||"#64748B",color:"#fff",borderRadius:"20px",padding:"3px 10px",fontSize:"11px",fontWeight:"600"}}>{r.category}</span>
                    {r.status&&SM[r.status]&&<span style={{background:SM[r.status].lc,color:SM[r.status].b,borderRadius:"20px",padding:"3px 10px",fontSize:"11px",fontWeight:"600"}}>{SM[r.status].l}</span>}
                  </div>
                  {r.procurement_officer&&<div style={{fontSize:"13px",color:"#475569",marginBottom:"4px"}}>👤 {r.procurement_officer}</div>}
                  {r.office_phone&&<div style={{fontSize:"13px",marginBottom:"4px"}}><a href={`tel:${r.office_phone}`} onClick={e=>e.stopPropagation()} style={{color:"#2563EB",textDecoration:"none",pointerEvents:"auto"}}>📞 {r.office_phone}</a></div>}
                  {r.procurement_email&&<div style={{fontSize:"13px",marginBottom:"8px"}}><a href={`mailto:${r.procurement_email}`} onClick={e=>e.stopPropagation()} style={{color:"#2563EB",textDecoration:"none",pointerEvents:"auto"}}>✉️ {r.procurement_email}</a></div>}
                  <div style={{display:"flex",gap:"8px",marginTop:"6px"}}>
                    {r.website&&<a href={r.website.startsWith("http")?r.website:"https://"+r.website} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{flex:1,background:"#1E293B",color:"#fff",borderRadius:"8px",padding:"9px 0",textAlign:"center",textDecoration:"none",fontSize:"13px",fontWeight:"600",pointerEvents:"auto"}}>🌐 Website</a>}
                    <a href={r.maps||("https://www.google.com/maps/search/"+encodeURIComponent(r.name+" Abu Dhabi"))} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{flex:1,background:"#16A34A",color:"#fff",borderRadius:"8px",padding:"9px 0",textAlign:"center",textDecoration:"none",fontSize:"13px",fontWeight:"600",pointerEvents:"auto"}}>📍 Maps</a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </>
        {userPos&&<Marker position={userPos} icon={userIcon}><Popup><div style={{fontFamily:"system-ui",fontWeight:"700",color:"#2563EB",padding:"4px 2px"}}>📍 You are here</div></Popup></Marker>}
      </MapContainer>
    </div>
  )
}

function AssignPill({id,value,assignees,onSave}:{id:number;value:string|null;assignees:string[];onSave:(v:string|null)=>void}){
  const onChange=async(e:React.ChangeEvent<HTMLSelectElement>)=>{
    const v=e.target.value||null
    onSave(v)
    await supabase.from("companies").update({assigned_to:v}).eq("id",id)
  }
  return(
    <select value={value||""} onChange={onChange}
      style={{background:value?"#EFF6FF":"#F8FAFC",color:value?"#1D4ED8":"#94A3B8",border:`1.5px solid ${value?"#BFDBFE":"#E2E8F0"}`,borderRadius:"20px",padding:"3px 10px",fontSize:"12px",fontWeight:"600",cursor:"pointer",appearance:"none",WebkitAppearance:"none",outline:"none"}}>
      <option value="">Unassigned</option>
      {assignees.map(a=><option key={a} value={a}>{a}</option>)}
    </select>
  )
}


function Pill({id,status,onChange}:{id:number;status:string|null;onChange:(v:string|null)=>void}){
  const[o,setO]=useState(false);const[pos,setPos]=useState({top:0,left:0});const ref=useRef<HTMLButtonElement>(null)
  const c=status?SM[status]:null
  return(<>
    <button ref={ref} onClick={()=>{if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+6,left:r.left})}setO(true)}}
      style={{background:c?c.lc:"#fff",color:c?c.b:"#334155",border:`1.5px ${c?"solid":"dashed"} ${c?c.b+"55":"#64748B"}`,borderRadius:"20px",padding:"3px 12px",cursor:"pointer",fontWeight:"600",fontSize:"12px",whiteSpace:"nowrap"}}>
      {c?c.l:"Set Status ▾"}
    </button>
    {o&&<><div style={{position:"fixed",inset:0,zIndex:999}} onClick={()=>setO(false)}/>
    <div style={{position:"fixed",top:pos.top,left:Math.min(pos.left,window.innerWidth-200),background:"#fff",borderRadius:"10px",boxShadow:"0 8px 32px rgba(0,0,0,.2)",zIndex:1000,minWidth:"180px",overflow:"hidden"}}>
      {ST.map(s=><button key={s.v} onClick={async()=>{setO(false);onChange(s.v);await supabase.from("companies").update({status:s.v}).eq("id",id)}}
        style={{display:"block",width:"100%",textAlign:"left",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",fontWeight:"600",color:s.b,fontSize:"14px"}}>{s.l}</button>)}
      {status&&<button onClick={async()=>{setO(false);onChange(null);await supabase.from("companies").update({status:null}).eq("id",id)}}
        style={{display:"block",width:"100%",textAlign:"left",padding:"10px 16px",background:"none",border:"none",cursor:"pointer",color:"#64748B",fontSize:"14px",borderTop:"1px solid #E2E8F0"}}>Clear</button>}
    </div></>}
  </>)
}

export default function App(){
  const[auth,setAuth]=useState(IS)
  const[pw,setPw]=useState("");const[pwErr,setPwErr]=useState(false)
  const[tab,setTab]=useState<"main"|"pending"|"map">("main")
  const[rows,setRows]=useState<Co[]>([]);const[pend,setPend]=useState<Pend[]>([])
  const[sett,setSett]=useState<Sett>({categories:DC,emirates:DE,assignees:DA})
  const[search,setSearch]=useState("")
  const[catF,setCatF]=useState("All");const[asgnF,setAsgnF]=useState("All");const[stF,setStF]=useState("All");const[emirF,setEmirF]=useState("All");const[sortBy,setSortBy]=useState("name")
  const[modal,setModal]=useState(false);const[settM,setSettM]=useState(false)
  const[editId,setEditId]=useState<number|null>(null);const[form,setForm]=useState({...E0});const[saving,setSaving]=useState(false)
  const[nCat,setNCat]=useState("");const[nEm,setNEm]=useState("");const[nAsgn,setNAsgn]=useState("")
  const[mobile,setMobile]=useState(window.innerWidth<768)
  useEffect(()=>{const h=()=>setMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[])
  const[contacts,setContacts]=useState<Map<number,Contact[]>>(new Map())
  const[contactModal,setContactModal]=useState<Co|null>(null)
  const[newEmail,setNewEmail]=useState({label:"",value:""})
  const[newPhone,setNewPhone]=useState({label:"",value:""})

  const load=useCallback(async()=>{
    const[{data:cos},{data:ps},{data:cfg},{data:cts}]=await Promise.all([
      supabase.from("companies").select("*").order("category").order("name"),
      supabase.from("pending_companies").select("*").order("added_date",{ascending:false}),
      supabase.from("app_settings").select("*"),
      supabase.from("company_contacts").select("*")
    ])
    if(cos)setRows(cos as Co[])
    if(ps)setPend(ps as Pend[])
    if(cfg&&cfg.length){const m:any=Object.fromEntries(cfg.map((r:any)=>[r.key,JSON.parse(r.value)]));setSett({categories:m.categories??DC,emirates:m.emirates??DE,assignees:m.assignees??DA})}
    if(cts){const m=new Map<number,Contact[]>();(cts as Contact[]).forEach(c=>{if(!m.has(c.company_id))m.set(c.company_id,[]);m.get(c.company_id)!.push(c)});setContacts(m)}
  },[])
  useEffect(()=>{if(auth)load()},[auth,load])
  useEffect(()=>{if(!auth)return;const t=setInterval(load,30000);return()=>clearInterval(t)},[auth,load])

  const login=()=>{if(btoa(pw)==="am9teWtvY2hlcnkxQA=="){sessionStorage.setItem("auth","1");setAuth(true);setPw("")}else setPwErr(true)}
  const approve=async(p:Pend)=>{
    const{data,error}=await supabase.from("companies").insert({name:p.name,category:p.category,address:p.city||"Abu Dhabi",website:p.website||"",maps:p.maps||"",procurement_email:p.procurement_email||"",office_phone:p.office_phone||"",procurement_officer:p.procurement_officer||"",notes:p.notes||"",added_date:p.added_date||new Date().toISOString().split("T")[0],physical_meeting_1:false,call_1:false,call_2:false,call_3:false,physical_meeting_2:false,status:null,assigned_to:null}).select()
    if(!error&&data&&data[0]){setRows(r=>[...r,data[0] as Co]);await supabase.from("pending_companies").delete().eq("id",p.id);setPend(x=>x.filter(c=>c.id!==p.id))}
  }
  const reject=async(id:number)=>{await supabase.from("pending_companies").delete().eq("id",id);setPend(x=>x.filter(c=>c.id!==id))}
  const save=async()=>{
    if(!form.name.trim())return;setSaving(true)
    if(editId){const{data}=await supabase.from("companies").update({...form,updated_at:new Date().toISOString()}).eq("id",editId).select();if(data&&data[0])setRows(r=>r.map(x=>x.id===editId?data[0] as Co:x))}
    else{const{data}=await supabase.from("companies").insert({...form,added_date:new Date().toISOString().split("T")[0],physical_meeting_1:false,call_1:false,call_2:false,call_3:false,physical_meeting_2:false,status:null,assigned_to:null}).select();if(data&&data[0])setRows(r=>[...r,data[0] as Co])}
    setSaving(false);setModal(false)
  }
  const del=async(id:number)=>{if(!confirm("Delete?"))return;await supabase.from("companies").delete().eq("id",id);setRows(r=>r.filter(x=>x.id!==id))}
  const toggle=async(id:number,f:string,v:boolean)=>{setRows(r=>r.map(x=>x.id===id?{...x,[f]:!v}:x));await supabase.from("companies").update({[f]:!v}).eq("id",id)}
  const recordMeet=async(id:number,cur:number|null)=>{
    const n=(cur||0)+1
    const ts=new Date().toISOString()
    setRows(r=>r.map(x=>x.id===id?{...x,meet_count:n,last_met_at:ts}:x))
    await supabase.from("companies").update({meet_count:n,last_met_at:ts}).eq("id",id)
  }
  const saveSett=async(key:string,vals:string[])=>{await supabase.from("app_settings").upsert({key,value:JSON.stringify(vals)});setSett(s=>({...s,[key]:vals}))}
  const addContact=async(companyId:number,type:"email"|"phone",label:string,value:string)=>{
    if(!value.trim())return
    const{data}=await supabase.from("company_contacts").insert({company_id:companyId,type,label:label.trim()||type,value:value.trim()}).select()
    if(data&&data[0])setContacts(prev=>{const n=new Map(prev);const arr=[...(n.get(companyId)||[])];arr.push(data[0] as Contact);n.set(companyId,arr);return n})
  }
  const removeContact=async(companyId:number,contactId:number)=>{
    await supabase.from("company_contacts").delete().eq("id",contactId)
    setContacts(prev=>{const n=new Map(prev);n.set(companyId,(n.get(companyId)||[]).filter(c=>c.id!==contactId));return n})
  }

  const filt=rows.filter(r=>{
    if(catF!=="All"&&r.category!==catF)return false
    if(asgnF!=="All"&&r.assigned_to!==asgnF)return false
    if(stF!=="All"&&r.status!==stF)return false
    if(emirF!=="All"&&r.address!==emirF)return false
    if(search){const q=search.toLowerCase();return r.name.toLowerCase().includes(q)||!!(r.procurement_officer?.toLowerCase().includes(q))||!!(r.procurement_email?.toLowerCase().includes(q))||!!(r.office_phone?.toLowerCase().includes(q))}
    return true
  })
  const display=[...filt].sort((a,b)=>{
    if(sortBy==="category")return a.category.localeCompare(b.category)
    if(sortBy==="emirate")return(a.address??"").localeCompare(b.address??"")
    if(sortBy==="status")return(a.status??"zzz").localeCompare(b.status??"zzz")
    return a.name.localeCompare(b.name)
  })
  const exportXLSX=()=>{
    const label=(v:string|null)=>v?(SM[v]?.l??v):""
    const rows=display.map(r=>({
      "Company":r.name,
      "Category":r.category,
      "Officer":r.procurement_officer||"",
      "Phone":r.office_phone||"",
      "Email":r.procurement_email||"",
      "Website":r.website||"",
      "Address":r.address||"",
      "Notes":r.notes||"",
      "Status":label(r.status),
      "Assigned To":r.assigned_to||"",
      "Meet 1":r.physical_meeting_1?"✓":"",
      "Call 1":r.call_1?"✓":"",
      "Call 2":r.call_2?"✓":"",
      "Call 3":r.call_3?"✓":"",
      "Meet 2":r.physical_meeting_2?"✓":""
    }))
    const ws=XLSX.utils.json_to_sheet(rows)
    ws["!cols"]=[{wch:30},{wch:22},{wch:22},{wch:18},{wch:28},{wch:28},{wch:18},{wch:40},{wch:14},{wch:14},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8}]
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,"Companies")
    XLSX.writeFile(wb,`abu-dhabi-companies-${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  if(!auth)return(
    <div style={{minHeight:"100vh",background:"#0F172A",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:"#1E293B",borderRadius:"16px",padding:"40px 32px",maxWidth:"360px",width:"100%",textAlign:"center"}}>
        <div style={{fontSize:"22px",fontWeight:"700",color:"#F1F5F9",marginBottom:"6px"}}>Abu Dhabi Client Tracker</div>
        <div style={{color:"#94A3B8",marginBottom:"24px",fontSize:"14px"}}>Enter password to continue</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Password"
          style={inp({background:"#0F172A",color:"#F1F5F9",border:"1px solid #334155",marginBottom:pwErr?"6px":"14px"})}/>
        {pwErr&&<div style={{color:"#EF4444",fontSize:"13px",marginBottom:"10px"}}>Incorrect password</div>}
        <button onClick={login} style={{...btnS("#3B82F6"),width:"100%",padding:"13px"}}>Enter</button>
      </div>
    </div>
  )

  const TH={background:"#1E293B",color:"#94A3B8",fontWeight:"600",fontSize:"11px",textTransform:"uppercase" as const,letterSpacing:"1px",padding:"10px 8px",textAlign:"left" as const,whiteSpace:"nowrap" as const,border:"1px solid #334155"}
  const TD={padding:"7px 8px",border:"1px solid #E2E8F0",fontSize:"13px",verticalAlign:"middle" as const,color:"#1E293B",background:"#fff"}

  const TABS=[{k:"main",l:"Companies",n:rows.length},{k:"map",l:"🗺 Map",n:null},{k:"pending",l:"Pending",n:pend.length}]

  return(
    <div style={{minHeight:"100vh",background:"#F8FAFC",fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column",paddingBottom:mobile?"64px":"0"}}>
      {/* Header */}
      <div style={{background:"#1E293B",padding:mobile?"10px 14px":"12px 20px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",position:"sticky",top:0,zIndex:900}}>
        <span style={{color:"#F1F5F9",fontWeight:"700",fontSize:mobile?"15px":"17px",marginRight:"auto"}}>🏢 {mobile?"AD Tracker":"Abu Dhabi Client Tracker"}</span>
        {!mobile&&TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{...btnS(tab===t.k?"#3B82F6":"#334155"),padding:"7px 14px",fontSize:"13px"}}>
            {t.l}{t.n!==null?` (${t.n})`:""}
          </button>
        ))}
        {tab==="main"&&!mobile&&<>
          <select value={catF} onChange={e=>setCatF(e.target.value)} style={inp({width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px",color:"#F1F5F9",background:"#334155",border:"none"})}>
            <option value="All">All Categories</option>{sett.categories.map(c=><option key={c}>{c}</option>)}</select>
          <select value={asgnF} onChange={e=>setAsgnF(e.target.value)} style={inp({width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px",color:"#F1F5F9",background:"#334155",border:"none"})}>
            <option value="All">All Assigned</option>{sett.assignees.map(a=><option key={a}>{a}</option>)}</select>
          <select value={stF} onChange={e=>setStF(e.target.value)} style={inp({width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px",color:"#F1F5F9",background:"#334155",border:"none"})}>
            <option value="All">All Statuses</option>{ST.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}</select>
          <select value={emirF} onChange={e=>setEmirF(e.target.value)} style={inp({width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px",color:"#F1F5F9",background:"#334155",border:"none"})}>
            <option value="All">All Emirates</option>{sett.emirates.map(e=><option key={e}>{e}</option>)}</select>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." style={inp({width:"150px",marginBottom:"0",fontSize:"12px",padding:"7px 10px"})}/>
        </>}
        <button onClick={()=>setSettM(true)} style={{...btnS("#334155"),padding:"7px 12px"}}>⚙</button>
        {tab==="main"&&<button onClick={exportXLSX} style={{...btnS("#059669"),padding:"7px 14px"}}>⬇ Export</button>}
        {tab==="main"&&<button onClick={()=>{setEditId(null);setForm({...E0,category:sett.categories[0]||DC[0],address:sett.emirates[0]||DE[0]});setModal(true)}} style={{...btnS("#3B82F6"),padding:"7px 14px"}}>+ Add</button>}
      </div>

      {/* Mobile search bar */}
      {mobile&&tab==="main"&&<div style={{background:"#1E293B",padding:"0 14px 10px",display:"flex",gap:"8px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search companies..." style={inp({marginBottom:"0",fontSize:"14px",flex:1})}/>
        <select value={catF} onChange={e=>setCatF(e.target.value)} style={inp({width:"auto",marginBottom:"0",fontSize:"13px",padding:"9px 8px"})}>
          <option value="All">All</option>{sett.categories.map(c=><option key={c} value={c}>{c.split(" ")[0]}</option>)}</select>
      </div>}

      {/* Count bar */}
      {tab!=="map"&&<div style={{background:"#fff",borderBottom:"1px solid #E2E8F0",padding:"5px 16px",fontSize:"12px",color:"#64748B"}}>
        {tab==="main"?`${display.length} of ${rows.length} companies`:`${pend.length} awaiting review`}
      </div>}

      {/* Map Tab */}
      {tab==="map"&&<div>
        <MapView rows={rows} mobile={mobile}/>
      </div>}

      {/* Main Tab - Desktop Table */}
      {tab==="main"&&!mobile&&<div style={{overflowX:"auto",padding:"16px"}}>
        <table style={{borderCollapse:"collapse",width:"100%",minWidth:"1400px",background:"#fff",borderRadius:"12px",overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.08)"}}>
          <thead><tr>
            {["Status","Company","Links","Category","Assigned","Officer","Contacts","Emirate"].map(h=><th key={h} style={TH}>{h}</th>)}
            {CBL.map(h=><th key={h} style={{...TH,textAlign:"center"}}>{h}</th>)}
            <th style={TH}>Notes</th><th style={TH}>Act</th>
          </tr></thead>
          <tbody>
            {display.map(r=>{const rcts=contacts.get(r.id)||[];const eCount=rcts.filter(c=>c.type==="email").length;const pCount=rcts.filter(c=>c.type==="phone").length;return(<tr key={r.id}>
              <td style={{...TD,minWidth:"130px"}}><Pill id={r.id} status={r.status} onChange={v=>setRows(x=>x.map(c=>c.id===r.id?{...c,status:v}:c))}/></td>
              <td style={{...TD,fontWeight:"600",minWidth:"180px"}}>{r.name}</td>
              <td style={{...TD,whiteSpace:"nowrap",textAlign:"center"}}>
                {r.website&&r.website.trim()
                  ?<a href={r.website.startsWith("http")?r.website.trim():"https://"+r.website.trim()} target="_blank" rel="noopener noreferrer" title={r.website} onClick={e=>e.stopPropagation()} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"28px",height:"28px",borderRadius:"6px",background:"#EFF6FF",textDecoration:"none",fontSize:"15px",marginRight:"4px",cursor:"pointer",pointerEvents:"auto"}}>🌐</a>
                  :<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"28px",height:"28px",borderRadius:"6px",background:"#F1F5F9",opacity:.35,fontSize:"15px",marginRight:"4px"}}>🌐</span>}
                {r.maps&&r.maps.trim()
                  ?<a href={r.maps.trim()} target="_blank" rel="noopener noreferrer" title="Google Maps" onClick={e=>e.stopPropagation()} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"28px",height:"28px",borderRadius:"6px",background:"#F0FDF4",textDecoration:"none",fontSize:"15px",cursor:"pointer",pointerEvents:"auto"}}>📍</a>
                  :<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"28px",height:"28px",borderRadius:"6px",background:"#F1F5F9",opacity:.35,fontSize:"15px"}}>📍</span>}
              </td>
              <td style={{...TD,minWidth:"140px"}}><span style={{background:"#EFF6FF",color:"#1D4ED8",borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:"600"}}>{r.category}</span></td>
              <td style={{...TD,minWidth:"120px"}}><AssignPill id={r.id} value={r.assigned_to} assignees={sett.assignees} onSave={v=>setRows(x=>x.map(c=>c.id===r.id?{...c,assigned_to:v}:c))}/></td>
              <td style={{...TD,minWidth:"130px"}}>{r.procurement_officer||<span style={{color:"#CBD5E1"}}>—</span>}</td>
              <td style={{...TD,minWidth:"100px",textAlign:"center"}}><button onClick={()=>setContactModal(r)} style={{background:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:"8px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",color:"#1E293B",display:"flex",alignItems:"center",gap:"4px",margin:"0 auto",whiteSpace:"nowrap"}}><span style={{color:eCount>0?"#2563EB":"#CBD5E1",fontWeight:eCount>0?"700":"400"}}>📧{eCount}</span><span style={{color:"#E2E8F0"}}>·</span><span style={{color:pCount>0?"#16A34A":"#CBD5E1",fontWeight:pCount>0?"700":"400"}}>📞{pCount}</span></button></td>
              <td style={{...TD}}>{r.address||<span style={{color:"#CBD5E1"}}>—</span>}</td>
              {CB.map(f=><td key={f} style={{...TD,textAlign:"center"}}><input type="checkbox" checked={!!r[f as keyof Co]} onChange={()=>toggle(r.id,f,!!r[f as keyof Co])} style={{width:"15px",height:"15px",cursor:"pointer"}}/></td>)}
              <td style={{...TD,maxWidth:"160px",fontSize:"12px",color:"#64748B"}}>{r.notes?.slice(0,60)}</td>
              <td style={{...TD,whiteSpace:"nowrap",minWidth:"110px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"4px",marginBottom:"5px"}}>
                  <button onClick={()=>recordMeet(r.id,r.meet_count)} style={{...btnS("#7C3AED"),padding:"4px 8px",fontSize:"12px"}}>+ Meet</button>
                  <span style={{fontWeight:"700",color:"#7C3AED",fontSize:"13px",minWidth:"16px"}}>{r.meet_count||0}</span>
                </div>
                {r.last_met_at&&<div style={{fontSize:"10px",color:"#94A3B8",marginBottom:"5px"}}>Last: {new Date(r.last_met_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>}
                <button onClick={()=>{setEditId(r.id);setForm({name:r.name,category:r.category,address:r.address,procurement_email:r.procurement_email,office_phone:r.office_phone,procurement_officer:r.procurement_officer,notes:r.notes,assigned_to:r.assigned_to??"",website:r.website??"",maps:r.maps??""});setModal(true)}} style={{...btnS("#EFF6FF","#3B82F6","4px 10px"),fontSize:"12px",marginRight:"4px"}}>Edit</button>
                <button onClick={()=>del(r.id)} style={{...btnS("#FEF2F2","#DC2626","4px 10px"),fontSize:"12px"}}>Del</button>
              </td>
            </tr>)})}
            {display.length===0&&<tr><td colSpan={15} style={{...TD,textAlign:"center",color:"#94A3B8",padding:"40px"}}>No companies found</td></tr>}
          </tbody>
        </table>
      </div>}

      {/* Main Tab - Mobile Cards */}
      {tab==="main"&&mobile&&<div style={{padding:"12px"}}>
        {display.map(r=>{
          const c=r.status?SM[r.status]:null
          return<div key={r.id} style={{background:"#fff",borderRadius:"12px",padding:"16px",marginBottom:"10px",boxShadow:"0 1px 4px rgba(0,0,0,.08)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
              <div style={{flex:1,paddingRight:"8px"}}>
                <div style={{fontWeight:"700",fontSize:"16px",color:"#1E293B"}}>{r.name}</div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"4px"}}>
                  <span style={{background:"#EFF6FF",color:"#1D4ED8",borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:"600"}}>{r.category}</span>
                  <AssignPill id={r.id} value={r.assigned_to} assignees={sett.assignees} onSave={v=>setRows(x=>x.map(c=>c.id===r.id?{...c,assigned_to:v}:c))}/>
                </div>
              </div>
              <Pill id={r.id} status={r.status} onChange={v=>setRows(x=>x.map(co=>co.id===r.id?{...co,status:v}:co))}/>
            </div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"10px"}}>
              <button onClick={()=>recordMeet(r.id,r.meet_count)} style={{background:"#F5F3FF",color:"#7C3AED",borderRadius:"8px",padding:"6px 12px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:"700"}}>
                🤝 {r.meet_count||0}{r.last_met_at?<span style={{fontWeight:"400",fontSize:"11px",color:"#94A3B8",marginLeft:"4px"}}>Last: {new Date(r.last_met_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>:null}
              </button>
              {(()=>{const mc=contacts.get(r.id)||[];const ec=mc.filter(c=>c.type==="email").length;const pc=mc.filter(c=>c.type==="phone").length;const tot=ec+pc;return<button onClick={()=>setContactModal(r)} style={{background:tot>0?"#EFF6FF":"#F8FAFC",color:tot>0?"#1D4ED8":"#94A3B8",borderRadius:"8px",padding:"6px 12px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>📇 Contacts{tot>0?` (${tot})`:""}</button>})()}
              {r.website&&<a href={r.website.startsWith("http")?r.website:"https://"+r.website} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{background:"#1E293B",color:"#fff",borderRadius:"8px",padding:"6px 12px",textDecoration:"none",fontSize:"13px",fontWeight:"600",pointerEvents:"auto"}}>🌐</a>}
              {(r.maps||r.name)&&<a href={r.maps||`https://www.google.com/maps/search/${encodeURIComponent(r.name+' Abu Dhabi')}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{background:"#DCFCE7",color:"#16A34A",borderRadius:"8px",padding:"6px 12px",textDecoration:"none",fontSize:"13px",fontWeight:"600",pointerEvents:"auto"}}>📍</a>}
            </div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {CB.map((f,i)=><label key={f} style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"12px",color:"#64748B",background:"#F8FAFC",borderRadius:"6px",padding:"4px 8px"}}>
                <input type="checkbox" checked={!!r[f as keyof Co]} onChange={()=>toggle(r.id,f,!!r[f as keyof Co])}/>{CBL[i]}
              </label>)}
            </div>
          </div>
        })}
        {display.length===0&&<div style={{textAlign:"center",color:"#94A3B8",padding:"40px",fontSize:"16px"}}>No companies found</div>}
      </div>}

      {/* Pending Tab */}
      {tab==="pending"&&<div style={{padding:"12px",maxWidth:"900px",margin:"0 auto",width:"100%"}}>
        {pend.length===0?<div style={{textAlign:"center",color:"#64748B",padding:"60px",fontSize:"16px"}}>No pending companies</div>
          :pend.map(p=><div key={p.id} style={{background:"#fff",borderRadius:"12px",padding:"16px",marginBottom:"10px",boxShadow:"0 1px 4px rgba(0,0,0,.08)",display:"flex",gap:"12px",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:"700",fontSize:"16px",color:"#1E293B",marginBottom:"4px"}}>{p.name}</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"8px"}}>
                <span style={{background:"#EFF6FF",color:"#1D4ED8",borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:"600"}}>{p.category}</span>
                <span style={{background:"#F0FDF4",color:"#166534",borderRadius:"20px",padding:"2px 10px",fontSize:"11px"}}>{p.city||p.address||"Abu Dhabi"}</span>
              </div>
              <div style={{fontSize:"13px",color:"#475569",display:"flex",gap:"12px",flexWrap:"wrap",pointerEvents:"auto"}}>
                {p.office_phone&&<a href={`tel:${p.office_phone}`} onClick={e=>e.stopPropagation()} style={{color:"#2563EB",pointerEvents:"auto"}}>📞 {p.office_phone}</a>}
                {p.procurement_email&&<a href={`mailto:${p.procurement_email}`} onClick={e=>e.stopPropagation()} style={{color:"#2563EB",pointerEvents:"auto"}}>✉️ {p.procurement_email}</a>}
                {p.website&&p.website.trim()
                  ?<a href={p.website.startsWith("http")?p.website.trim():"https://"+p.website.trim()} target="_blank" rel="noopener noreferrer" title={p.website} onClick={e=>e.stopPropagation()} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"30px",height:"30px",borderRadius:"8px",background:"#EFF6FF",textDecoration:"none",fontSize:"16px",cursor:"pointer",pointerEvents:"auto"}}>🌐</a>
                  :<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"30px",height:"30px",borderRadius:"8px",background:"#F1F5F9",fontSize:"16px",opacity:.3}}>🌐</span>}
                {p.maps&&p.maps.trim()
                  ?<a href={p.maps.trim()} target="_blank" rel="noopener noreferrer" title="Google Maps" onClick={e=>e.stopPropagation()} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"30px",height:"30px",borderRadius:"8px",background:"#F0FDF4",textDecoration:"none",fontSize:"16px",cursor:"pointer",pointerEvents:"auto"}}>📍</a>
                  :<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"30px",height:"30px",borderRadius:"8px",background:"#F1F5F9",fontSize:"16px",opacity:.3}}>📍</span>}
              </div>
              {p.notes&&<div style={{marginTop:"8px",fontSize:"12px",color:"#94A3B8"}}>{p.notes}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px",flexShrink:0}}>
              <button onClick={()=>approve(p)} style={{...btnS("#16A34A"),padding:"10px 16px",fontSize:"14px"}}>✓</button>
              <button onClick={()=>reject(p.id)} style={{...btnS("#DC2626"),padding:"10px 16px",fontSize:"14px"}}>✗</button>
            </div>
          </div>)}
      </div>}

      {/* Mobile Bottom Tab Bar */}
      {mobile&&<div style={{position:"fixed",bottom:0,left:0,right:0,background:"#1E293B",display:"flex",borderTop:"1px solid #334155",zIndex:950}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{flex:1,padding:"12px 4px",background:"none",border:"none",cursor:"pointer",color:tab===t.k?"#60A5FA":"#94A3B8",fontSize:"11px",fontWeight:"600",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
            <span style={{fontSize:"18px"}}>{t.k==="main"?"🏢":t.k==="map"?"🗺":"📋"}</span>
            {t.l}{t.n!==null?` (${t.n})`:""}
          </button>
        ))}
      </div>}

      {/* Add/Edit Modal */}
      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0"}}>
        <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px",width:"100%",maxWidth:"540px",maxHeight:"92vh",overflowY:"auto"}}>
          <div style={{fontWeight:"700",fontSize:"18px",color:"#1E293B",marginBottom:"20px"}}>{editId?"Edit Company":"Add Company"}</div>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Company Name *" style={inp()}/>
          <input value={form.procurement_officer} onChange={e=>setForm(f=>({...f,procurement_officer:e.target.value}))} placeholder="Procurement Officer" style={inp()}/>
          <input value={form.procurement_email} onChange={e=>setForm(f=>({...f,procurement_email:e.target.value}))} placeholder="Procurement Email" style={inp()}/>
          <input value={form.office_phone} onChange={e=>setForm(f=>({...f,office_phone:e.target.value}))} placeholder="Office Phone (+971 2...)" style={inp()}/>
          <input value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="Website URL" style={inp()}/>
          <input value={form.maps} onChange={e=>setForm(f=>({...f,maps:e.target.value}))} placeholder="Google Maps URL" style={inp()}/>
          <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes" rows={3} style={inp({resize:"vertical"})}/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp()}>{sett.categories.map(c=><option key={c}>{c}</option>)}</select>
          <select value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} style={inp()}>{sett.emirates.map(e=><option key={e}>{e}</option>)}</select>
          <select value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))} style={inp()}><option value="">Unassigned</option>{sett.assignees.map(a=><option key={a}>{a}</option>)}</select>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>setModal(false)} style={{...btnS("#F1F5F9","#64748B"),flex:1,padding:"13px"}}>Cancel</button>
            <button onClick={save} disabled={saving} style={{...btnS("#3B82F6"),flex:2,padding:"13px"}}>{saving?"Saving...":"Save"}</button>
          </div>
        </div>
      </div>}


      {/* Contacts Modal */}
      {contactModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
        <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px",width:"100%",maxWidth:"540px",maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <div style={{fontWeight:"700",fontSize:"17px",color:"#1E293B"}}>📇 {contactModal.name}</div>
            <button onClick={()=>{setContactModal(null);setNewEmail({label:"",value:""});setNewPhone({label:"",value:""})}} style={{background:"none",border:"none",fontSize:"24px",cursor:"pointer",color:"#94A3B8",lineHeight:"1"}}>×</button>
          </div>

          {/* Emails section */}
          <div style={{marginBottom:"24px"}}>
            <div style={{fontWeight:"700",fontSize:"11px",color:"#64748B",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:"10px"}}>📧 Emails</div>
            {(contacts.get(contactModal.id)||[]).filter(c=>c.type==="email").length===0&&<div style={{color:"#CBD5E1",fontSize:"13px",fontStyle:"italic",marginBottom:"8px"}}>No emails added yet</div>}
            {(contacts.get(contactModal.id)||[]).filter(c=>c.type==="email").map(c=>(
              <div key={c.id} style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"8px",background:"#F8FAFC",borderRadius:"10px",padding:"10px 14px"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"2px"}}>{c.label||"Email"}</div>
                  <a href={`mailto:${c.value}`} onClick={e=>e.stopPropagation()} style={{color:"#2563EB",fontSize:"14px",fontWeight:"500",textDecoration:"none",wordBreak:"break-all",pointerEvents:"auto"}}>{c.value}</a>
                </div>
                <button onClick={()=>removeContact(contactModal.id,c.id)} style={{background:"#FEF2F2",color:"#DC2626",border:"none",borderRadius:"6px",width:"28px",height:"28px",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
              <input value={newEmail.label} onChange={e=>setNewEmail(v=>({...v,label:e.target.value}))} placeholder="Label (e.g. Procurement)" style={{...inp(),flex:"0 0 150px",marginBottom:"0",fontSize:"13px"}}/>
              <input value={newEmail.value} onChange={e=>setNewEmail(v=>({...v,value:e.target.value}))} placeholder="email@company.com" type="email" style={{...inp(),flex:1,marginBottom:"0",fontSize:"13px"}} onKeyDown={e=>{if(e.key==="Enter"&&newEmail.value.trim()){addContact(contactModal.id,"email",newEmail.label,newEmail.value);setNewEmail({label:"",value:""})}}}/>
              <button onClick={()=>{if(!newEmail.value.trim())return;addContact(contactModal.id,"email",newEmail.label,newEmail.value);setNewEmail({label:"",value:""})}} style={{...btnS("#2563EB"),padding:"9px 14px",flexShrink:0}}>+</button>
            </div>
          </div>

          {/* Phones section */}
          <div style={{marginBottom:"24px"}}>
            <div style={{fontWeight:"700",fontSize:"11px",color:"#64748B",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:"10px"}}>📞 Phone Numbers</div>
            {(contacts.get(contactModal.id)||[]).filter(c=>c.type==="phone").length===0&&<div style={{color:"#CBD5E1",fontSize:"13px",fontStyle:"italic",marginBottom:"8px"}}>No phone numbers added yet</div>}
            {(contacts.get(contactModal.id)||[]).filter(c=>c.type==="phone").map(c=>(
              <div key={c.id} style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"8px",background:"#F8FAFC",borderRadius:"10px",padding:"10px 14px"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"2px"}}>{c.label||"Phone"}</div>
                  <a href={`tel:${c.value}`} onClick={e=>e.stopPropagation()} style={{color:"#16A34A",fontSize:"14px",fontWeight:"500",textDecoration:"none",pointerEvents:"auto"}}>{c.value}</a>
                </div>
                <button onClick={()=>removeContact(contactModal.id,c.id)} style={{background:"#FEF2F2",color:"#DC2626",border:"none",borderRadius:"6px",width:"28px",height:"28px",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
              <input value={newPhone.label} onChange={e=>setNewPhone(v=>({...v,label:e.target.value}))} placeholder="Label (e.g. Reception)" style={{...inp(),flex:"0 0 150px",marginBottom:"0",fontSize:"13px"}}/>
              <input value={newPhone.value} onChange={e=>setNewPhone(v=>({...v,value:e.target.value}))} placeholder="+971 2 xxx xxxx" type="tel" style={{...inp(),flex:1,marginBottom:"0",fontSize:"13px"}} onKeyDown={e=>{if(e.key==="Enter"&&newPhone.value.trim()){addContact(contactModal.id,"phone",newPhone.label,newPhone.value);setNewPhone({label:"",value:""})}}}/>
              <button onClick={()=>{if(!newPhone.value.trim())return;addContact(contactModal.id,"phone",newPhone.label,newPhone.value);setNewPhone({label:"",value:""})}} style={{...btnS("#16A34A"),padding:"9px 14px",flexShrink:0}}>+</button>
            </div>
          </div>

          <button onClick={()=>{setContactModal(null);setNewEmail({label:"",value:""});setNewPhone({label:"",value:""})}} style={{...btnS("#F1F5F9","#64748B"),width:"100%",padding:"13px"}}>Done</button>
        </div>
      </div>}

      {/* Settings Modal */}
      {settM&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
        <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px",width:"100%",maxWidth:"440px",maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{fontWeight:"700",fontSize:"18px",color:"#1E293B",marginBottom:"20px"}}>⚙ Settings</div>
          {[{key:"categories",label:"Categories",val:nCat,set:setNCat,list:sett.categories},{key:"emirates",label:"Emirates",val:nEm,set:setNEm,list:sett.emirates},{key:"assignees",label:"Assignees",val:nAsgn,set:setNAsgn,list:sett.assignees}].map(({key,label,val,set,list})=>(
            <div key={key} style={{marginBottom:"20px"}}>
              <div style={{fontWeight:"600",color:"#334155",fontSize:"13px",marginBottom:"8px"}}>{label}</div>
              {list.map(item=><div key={item} style={{display:"flex",gap:"6px",marginBottom:"4px"}}>
                <span style={{flex:1,background:"#F8FAFC",padding:"5px 10px",borderRadius:"6px",fontSize:"13px"}}>{item}</span>
                <button onClick={()=>saveSett(key,list.filter(x=>x!==item))} style={{...btnS("#FEF2F2","#DC2626","4px 8px"),fontSize:"12px"}}>×</button>
              </div>)}
              <div style={{display:"flex",gap:"6px",marginTop:"6px"}}>
                <input value={val} onChange={e=>set(e.target.value)} placeholder={`Add...`} style={inp({marginBottom:"0",flex:1,fontSize:"12px"})} onKeyDown={e=>{if(e.key==="Enter"&&val.trim()){saveSett(key,[...list,val.trim()]);set("")}}}/>
                <button onClick={async()=>{if(!val.trim())return;await saveSett(key,[...list,val.trim()]);set("")}} style={{...btnS("#3B82F6","white","8px 12px")}}>+</button>
              </div>
            </div>
          ))}
          <button onClick={()=>setSettM(false)} style={{...btnS("#F1F5F9","#64748B"),width:"100%",padding:"13px"}}>Close</button>
        </div>
      </div>}
    </div>
  )
}
