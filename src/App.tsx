import{useState,useEffect,useCallback,useRef}from"react"
import{supabase}from"./lib/supabase"

type Co={id:number;name:string;category:string;address:string;website:string;procurement_email:string;office_phone:string;procurement_officer:string;notes:string;physical_meeting_1:boolean;call_1:boolean;call_2:boolean;call_3:boolean;physical_meeting_2:boolean;status:string|null;assigned_to:string|null;added_date:string}
type Pend={id:number;name:string;category:string;address:string;city:string;website:string;maps:string;procurement_email:string;office_phone:string;procurement_officer:string;notes:string;added_date:string}
type Sett={categories:string[];emirates:string[];assignees:string[]}
const DC=["Interior Companies","Design Companies","Consultants","Hotels","Holding Companies","Royal HH Offices","FF&E Buying Companies","Joinery Companies"]
const DE=["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"]
const DA=["Majen","Aashel"]
const E0={name:"",category:DC[0],address:DE[0],procurement_email:"",office_phone:"",procurement_officer:"",notes:"",assigned_to:"",website:""}
const ST=[{v:"green",l:"Great",b:"#16A34A",lc:"#DCFCE7"},{v:"yellow",l:"Follow Up",b:"#D97706",lc:"#FEF3C7"},{v:"red",l:"Not a Fit",b:"#DC2626",lc:"#FEE2E2"},{v:"black",l:"Do Not Contact",b:"#1E293B",lc:"#F1F5F9"}]
const SM:Record<string,typeof ST[0]>=Object.fromEntries(ST.map(s=>[s.v,s]))
const CB=["physical_meeting_1","call_1","call_2","call_3","physical_meeting_2"]
const CBL=["Meet 1","Call 1","Call 2","Call 3","Meet 2"]
const IS=typeof window!=="undefined"&&sessionStorage.getItem("auth")==="1"
const inp={width:"100%",padding:"9px 12px",border:"1px solid #CBD5E1",borderRadius:"8px",fontSize:"14px",color:"#1E293B",background:"#fff",boxSizing:"border-box" as const,marginBottom:"10px"}
const btnS=(bg:string,c="white",p="10px 18px")=>({background:bg,color:c,border:"none",borderRadius:"8px",padding:p,cursor:"pointer",fontWeight:"600",fontSize:"13px"} as const)

function Pill({id,status,onChange}:{id:number;status:string|null;onChange:(v:string|null)=>void}){
  const[o,setO]=useState(false);const[pos,setPos]=useState({top:0,left:0});const ref=useRef<HTMLButtonElement>(null)
  const c=status?SM[status]:null
  return(<>
    <button ref={ref} onClick={()=>{if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+6,left:r.left})}setO(true)}}
      style={{background:c?c.lc:"#fff",color:c?c.b:"#334155",border:`1.5px ${c?"solid":"dashed"} ${c?c.b+"55":"#64748B"}`,borderRadius:"20px",padding:"3px 12px",cursor:"pointer",fontWeight:"600",fontSize:"12px",whiteSpace:"nowrap"}}>
      {c?c.l:"Set Status ▾"}
    </button>
    {o&&<><div style={{position:"fixed",inset:0,zIndex:999}} onClick={()=>setO(false)}/>
    <div style={{position:"fixed",top:pos.top,left:pos.left,background:"#fff",borderRadius:"10px",boxShadow:"0 8px 32px rgba(0,0,0,.2)",zIndex:1000,minWidth:"180px",overflow:"hidden"}}>
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
  const[tab,setTab]=useState<"main"|"pending">("main")
  const[rows,setRows]=useState<Co[]>([]);const[pend,setPend]=useState<Pend[]>([])
  const[sett,setSett]=useState<Sett>({categories:DC,emirates:DE,assignees:DA})
  const[search,setSearch]=useState("")
  const[catF,setCatF]=useState("All");const[stF,setStF]=useState("All");const[emirF,setEmirF]=useState("All");const[sortBy,setSortBy]=useState("name")
  const[modal,setModal]=useState(false);const[settM,setSettM]=useState(false)
  const[editId,setEditId]=useState<number|null>(null);const[form,setForm]=useState({...E0});const[saving,setSaving]=useState(false)
  const[nCat,setNCat]=useState("");const[nEm,setNEm]=useState("");const[nAsgn,setNAsgn]=useState("")

  const load=useCallback(async()=>{
    const[{data:cos},{data:ps},{data:cfg}]=await Promise.all([
      supabase.from("companies").select("*").order("category").order("name"),
      supabase.from("pending_companies").select("*").order("added_date",{ascending:false}),
      supabase.from("app_settings").select("*")
    ])
    if(cos)setRows(cos as Co[])
    if(ps)setPend(ps as Pend[])
    if(cfg&&cfg.length){const m:any=Object.fromEntries(cfg.map((r:any)=>[r.key,JSON.parse(r.value)]));setSett({categories:m.categories??DC,emirates:m.emirates??DE,assignees:m.assignees??DA})}
  },[])
  useEffect(()=>{if(auth)load()},[auth,load])
  useEffect(()=>{if(!auth)return;const t=setInterval(load,30000);return()=>clearInterval(t)},[auth,load])

  const login=()=>{if(btoa(pw)==="am9teWtvY2hlcnkxQA=="){sessionStorage.setItem("auth","1");setAuth(true);setPw("")}else setPwErr(true)}

  const approve=async(p:Pend)=>{
    const{data,error}=await supabase.from("companies").insert({
      name:p.name,category:p.category,address:p.city||"Abu Dhabi",website:p.website||"",
      procurement_email:p.procurement_email||"",office_phone:p.office_phone||"",
      procurement_officer:p.procurement_officer||"",notes:p.notes||"",
      added_date:p.added_date||new Date().toISOString().split("T")[0],
      physical_meeting_1:false,call_1:false,call_2:false,call_3:false,physical_meeting_2:false,status:null,assigned_to:null
    }).select()
    if(!error&&data&&data[0]){
      setRows(r=>[...r,data[0] as Co])
      await supabase.from("pending_companies").delete().eq("id",p.id)
      setPend(x=>x.filter(c=>c.id!==p.id))
    }
  }
  const reject=async(id:number)=>{await supabase.from("pending_companies").delete().eq("id",id);setPend(x=>x.filter(c=>c.id!==id))}
  const save=async()=>{
    if(!form.name.trim())return;setSaving(true)
    if(editId){
      const{data}=await supabase.from("companies").update({...form,updated_at:new Date().toISOString()}).eq("id",editId).select()
      if(data&&data[0])setRows(r=>r.map(x=>x.id===editId?data[0] as Co:x))
    }else{
      const{data}=await supabase.from("companies").insert({...form,added_date:new Date().toISOString().split("T")[0],physical_meeting_1:false,call_1:false,call_2:false,call_3:false,physical_meeting_2:false,status:null,assigned_to:null}).select()
      if(data&&data[0])setRows(r=>[...r,data[0] as Co])
    }
    setSaving(false);setModal(false)
  }
  const del=async(id:number)=>{if(!confirm("Delete?"))return;await supabase.from("companies").delete().eq("id",id);setRows(r=>r.filter(x=>x.id!==id))}
  const toggle=async(id:number,f:string,v:boolean)=>{setRows(r=>r.map(x=>x.id===id?{...x,[f]:!v}:x));await supabase.from("companies").update({[f]:!v}).eq("id",id)}
  const saveSett=async(key:string,vals:string[])=>{await supabase.from("app_settings").upsert({key,value:JSON.stringify(vals)});setSett(s=>({...s,[key]:vals}))}

  const filt=rows.filter(r=>{
    if(catF!=="All"&&r.category!==catF)return false
    if(stF!=="All"&&r.status!==stF)return false
    if(emirF!=="All"&&r.address!==emirF)return false
    if(search){const q=search.toLowerCase();return r.name.toLowerCase().includes(q)||!!(r.procurement_officer?.toLowerCase().includes(q))||!!(r.procurement_email?.toLowerCase().includes(q))||!!(r.office_phone?.toLowerCase().includes(q))}
    return true
  })
  const display=[...filt].sort((a,b)=>{
    if(sortBy==="emirate")return(a.address??"").localeCompare(b.address??"")
    if(sortBy==="category")return a.category.localeCompare(b.category)
    if(sortBy==="assigned")return(a.assigned_to??"zzz").localeCompare(b.assigned_to??"zzz")
    if(sortBy==="status")return(a.status??"zzz").localeCompare(b.status??"zzz")
    return a.name.localeCompare(b.name)
  })

  if(!auth)return(
    <div style={{minHeight:"100vh",background:"#0F172A",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#1E293B",borderRadius:"12px",padding:"40px",maxWidth:"360px",width:"90%",textAlign:"center"}}>
        <div style={{fontSize:"22px",fontWeight:"700",color:"#F1F5F9",marginBottom:"6px"}}>Abu Dhabi Client Tracker</div>
        <div style={{color:"#94A3B8",marginBottom:"20px",fontSize:"14px"}}>Enter password to continue</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Password"
          style={{...inp,background:"#0F172A",color:"#F1F5F9",border:"1px solid #334155",marginBottom:pwErr?"6px":"12px"}}/>
        {pwErr&&<div style={{color:"#EF4444",fontSize:"13px",marginBottom:"10px"}}>Incorrect password</div>}
        <button onClick={login} style={{...btnS("#3B82F6"),width:"100%",padding:"12px"}}>Enter</button>
      </div>
    </div>
  )

  const TH={background:"#1E293B",color:"#94A3B8",fontWeight:"600",fontSize:"11px",textTransform:"uppercase" as const,letterSpacing:"1px",padding:"10px 8px",textAlign:"left" as const,whiteSpace:"nowrap" as const,border:"1px solid #334155"}
  const TD={padding:"7px 8px",border:"1px solid #E2E8F0",fontSize:"13px",verticalAlign:"middle" as const,color:"#1E293B",background:"#fff"}

  return(
    <div style={{minHeight:"100vh",background:"#F8FAFC",fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"#1E293B",padding:"14px 20px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
        <span style={{color:"#F1F5F9",fontWeight:"700",fontSize:"17px",marginRight:"auto"}}>🏢 Abu Dhabi Client Tracker</span>
        {tab==="main"&&<>
          <select value={catF} onChange={e=>setCatF(e.target.value)} style={{...inp,width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px"}}>
            <option value="All">All Categories</option>{sett.categories.map(c=><option key={c}>{c}</option>)}</select>
          <select value={stF} onChange={e=>setStF(e.target.value)} style={{...inp,width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px"}}>
            <option value="All">All Statuses</option>{ST.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}</select>
          <select value={emirF} onChange={e=>setEmirF(e.target.value)} style={{...inp,width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px"}}>
            <option value="All">All Emirates</option>{sett.emirates.map(e=><option key={e}>{e}</option>)}</select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...inp,width:"auto",marginBottom:"0",fontSize:"12px",padding:"7px 10px"}}>
            <option value="name">Sort: Name</option><option value="category">Sort: Category</option>
            <option value="emirate">Sort: Emirate</option><option value="assigned">Sort: Assigned</option><option value="status">Sort: Status</option></select>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." style={{...inp,width:"150px",marginBottom:"0",fontSize:"12px",padding:"7px 10px"}}/>
        </>}
        <button onClick={()=>setSettM(true)} style={{...btnS("#334155"),padding:"7px 12px"}}>⚙</button>
        {tab==="main"&&<button onClick={()=>{setEditId(null);setForm({...E0,category:sett.categories[0]||DC[0],address:sett.emirates[0]||DE[0]});setModal(true)}} style={{...btnS("#3B82F6"),padding:"7px 14px"}}>+ Add</button>}
        <button onClick={()=>setTab(t=>t==="main"?"pending":"main")} style={{...btnS(tab==="pending"?"#7C3AED":"#475569"),padding:"7px 14px"}}>
          {tab==="main"?`Pending (${pend.length})`:"← Companies"}</button>
      </div>
      <div style={{background:"#fff",borderBottom:"1px solid #E2E8F0",padding:"5px 20px",fontSize:"12px",color:"#64748B"}}>
        {tab==="main"?`${display.length} of ${rows.length} companies`:`${pend.length} awaiting review`}</div>

      {tab==="main"&&<div style={{overflowX:"auto",padding:"16px"}}>
        <table style={{borderCollapse:"collapse",width:"100%",minWidth:"1400px",background:"#fff",borderRadius:"12px",overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.08)"}}>
          <thead><tr>
            {["Status","Company","Category","Assigned","Officer","Email","Phone","Emirate"].map(h=><th key={h} style={TH}>{h}</th>)}
            {CBL.map(h=><th key={h} style={{...TH,textAlign:"center"}}>{h}</th>)}
            <th style={TH}>Notes</th><th style={TH}>Actions</th>
          </tr></thead>
          <tbody>
            {display.map(r=><tr key={r.id}>
              <td style={{...TD,minWidth:"130px"}}><Pill id={r.id} status={r.status} onChange={v=>setRows(x=>x.map(c=>c.id===r.id?{...c,status:v}:c))}/></td>
              <td style={{...TD,fontWeight:"600",minWidth:"180px"}}>{r.website?<a href={r.website} target="_blank" rel="noreferrer" style={{color:"#1E293B",textDecoration:"none"}}>{r.name} 🔗</a>:r.name}</td>
              <td style={{...TD,minWidth:"140px"}}><span style={{background:"#EFF6FF",color:"#1D4ED8",borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:"600"}}>{r.category}</span></td>
              <td style={{...TD,minWidth:"90px"}}>{r.assigned_to||<span style={{color:"#CBD5E1"}}>—</span>}</td>
              <td style={{...TD,minWidth:"140px"}}>{r.procurement_officer||<span style={{color:"#CBD5E1"}}>—</span>}</td>
              <td style={{...TD,minWidth:"180px"}}>{r.procurement_email?<a href={`mailto:${r.procurement_email}`} style={{color:"#3B82F6"}}>{r.procurement_email}</a>:<span style={{color:"#CBD5E1"}}>—</span>}</td>
              <td style={{...TD,minWidth:"130px"}}>{r.office_phone||<span style={{color:"#CBD5E1"}}>—</span>}</td>
              <td style={{...TD,minWidth:"100px"}}>{r.address||<span style={{color:"#CBD5E1"}}>—</span>}</td>
              {CB.map(f=><td key={f} style={{...TD,textAlign:"center"}}><input type="checkbox" checked={!!r[f as keyof Co]} onChange={()=>toggle(r.id,f,!!r[f as keyof Co])} style={{width:"15px",height:"15px",cursor:"pointer"}}/></td>)}
              <td style={{...TD,maxWidth:"200px",fontSize:"12px",color:"#64748B"}}>{r.notes}</td>
              <td style={{...TD,whiteSpace:"nowrap"}}>
                <button onClick={()=>{setEditId(r.id);setForm({name:r.name,category:r.category,address:r.address,procurement_email:r.procurement_email,office_phone:r.office_phone,procurement_officer:r.procurement_officer,notes:r.notes,assigned_to:r.assigned_to??"",website:r.website??""});setModal(true)}} style={{...btnS("#EFF6FF","#3B82F6","4px 10px"),fontSize:"12px",marginRight:"4px"}}>Edit</button>
                <button onClick={()=>del(r.id)} style={{...btnS("#FEF2F2","#DC2626","4px 10px"),fontSize:"12px"}}>Del</button>
              </td>
            </tr>)}
            {display.length===0&&<tr><td colSpan={15} style={{...TD,textAlign:"center",color:"#94A3B8",padding:"40px"}}>No companies found</td></tr>}
          </tbody>
        </table>
      </div>}

      {tab==="pending"&&<div style={{padding:"16px",maxWidth:"900px",margin:"0 auto"}}>
        {pend.length===0
          ?<div style={{textAlign:"center",color:"#64748B",padding:"60px",fontSize:"16px"}}>No pending companies yet</div>
          :pend.map(p=><div key={p.id} style={{background:"#fff",borderRadius:"12px",padding:"20px",marginBottom:"12px",boxShadow:"0 1px 4px rgba(0,0,0,.08)",display:"flex",gap:"16px",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:"700",fontSize:"16px",color:"#1E293B",marginBottom:"4px"}}>{p.name}</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"8px"}}>
                <span style={{background:"#EFF6FF",color:"#1D4ED8",borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:"600"}}>{p.category}</span>
                <span style={{background:"#F0FDF4",color:"#166534",borderRadius:"20px",padding:"2px 10px",fontSize:"11px"}}>{p.city||p.address||"Abu Dhabi"}</span>
              </div>
              <div style={{fontSize:"13px",color:"#475569",display:"flex",gap:"16px",flexWrap:"wrap"}}>
                {p.office_phone&&<span>📞 {p.office_phone}</span>}
                {p.procurement_email&&<span>✉️ {p.procurement_email}</span>}
                {p.procurement_officer&&<span>👤 {p.procurement_officer}</span>}
                {p.website&&<a href={p.website} target="_blank" rel="noreferrer" style={{color:"#3B82F6"}}>🔗 Website</a>}
                {p.maps&&<a href={p.maps} target="_blank" rel="noreferrer" style={{color:"#16A34A"}}>📍 Maps</a>}
              </div>
              {p.notes&&<div style={{marginTop:"8px",fontSize:"12px",color:"#94A3B8"}}>{p.notes}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              <button onClick={()=>approve(p)} style={{...btnS("#16A34A"),padding:"8px 18px"}}>✓ Approve</button>
              <button onClick={()=>reject(p.id)} style={{...btnS("#DC2626"),padding:"8px 18px"}}>✗ Reject</button>
            </div>
          </div>)
        }
      </div>}

      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
        <div style={{background:"#fff",borderRadius:"16px",padding:"28px",width:"100%",maxWidth:"520px",maxHeight:"92vh",overflowY:"auto"}}>
          <div style={{fontWeight:"700",fontSize:"18px",color:"#1E293B",marginBottom:"20px"}}>{editId?"Edit Company":"Add Company"}</div>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Company Name *" style={inp}/>
          <input value={form.procurement_officer} onChange={e=>setForm(f=>({...f,procurement_officer:e.target.value}))} placeholder="Procurement Officer" style={inp}/>
          <input value={form.procurement_email} onChange={e=>setForm(f=>({...f,procurement_email:e.target.value}))} placeholder="Procurement Email" style={inp}/>
          <input value={form.office_phone} onChange={e=>setForm(f=>({...f,office_phone:e.target.value}))} placeholder="Office Phone" style={inp}/>
          <input value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="Website URL" style={inp}/>
          <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes" rows={3} style={{...inp,resize:"vertical"}}/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp}>{sett.categories.map(c=><option key={c}>{c}</option>)}</select>
          <select value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} style={inp}>{sett.emirates.map(e=><option key={e}>{e}</option>)}</select>
          <select value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))} style={inp}><option value="">Unassigned</option>{sett.assignees.map(a=><option key={a}>{a}</option>)}</select>
          <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
            <button onClick={()=>setModal(false)} style={btnS("#F1F5F9","#64748B")}>Cancel</button>
            <button onClick={save} disabled={saving} style={btnS("#3B82F6")}>{saving?"Saving...":"Save"}</button>
          </div>
        </div>
      </div>}

      {settM&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
        <div style={{background:"#fff",borderRadius:"16px",padding:"28px",width:"100%",maxWidth:"440px",maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{fontWeight:"700",fontSize:"18px",color:"#1E293B",marginBottom:"20px"}}>⚙ Settings</div>
          {[{key:"categories",label:"Categories",val:nCat,set:setNCat,list:sett.categories},{key:"emirates",label:"Emirates",val:nEm,set:setNEm,list:sett.emirates},{key:"assignees",label:"Assignees",val:nAsgn,set:setNAsgn,list:sett.assignees}].map(({key,label,val,set,list})=>(
            <div key={key} style={{marginBottom:"20px"}}>
              <div style={{fontWeight:"600",color:"#334155",fontSize:"13px",marginBottom:"8px"}}>{label}</div>
              {list.map(item=><div key={item} style={{display:"flex",gap:"6px",marginBottom:"4px"}}>
                <span style={{flex:1,background:"#F8FAFC",padding:"5px 10px",borderRadius:"6px",fontSize:"13px"}}>{item}</span>
                <button onClick={()=>saveSett(key,list.filter(x=>x!==item))} style={{...btnS("#FEF2F2","#DC2626","4px 8px"),fontSize:"12px"}}>×</button>
              </div>)}
              <div style={{display:"flex",gap:"6px",marginTop:"6px"}}>
                <input value={val} onChange={e=>set(e.target.value)} placeholder={`Add ${label.slice(0,-1).toLowerCase()}...`} style={{...inp,marginBottom:"0",flex:1,fontSize:"12px"}}/>
                <button onClick={async()=>{if(!val.trim())return;await saveSett(key,[...list,val.trim()]);set("")}} style={{...btnS("#3B82F6","white","8px 12px")}}>+</button>
              </div>
            </div>
          ))}
          <button onClick={()=>setSettM(false)} style={{...btnS("#F1F5F9","#64748B"),width:"100%"}}>Close</button>
        </div>
      </div>}
    </div>
  )
}
