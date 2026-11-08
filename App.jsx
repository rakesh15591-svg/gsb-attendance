import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlarmClock, ArrowDownToLine, BadgeCheck, CalendarDays, Check,
  ChevronDown, CircleAlert, Clock3, Download, Fingerprint, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings, ShieldCheck, Smartphone, Users,
  UserCheck, UserMinus, X
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { isConfigured, supabase } from "./supabase";

const nav = [
  ["Dashboard", LayoutDashboard], ["Employees", Users], ["Attendance", UserCheck],
  ["Shifts", Clock3], ["Leave requests", CalendarDays], ["Device integration", Fingerprint]
];
const today = () => new Date().toISOString().slice(0,10);
const fmtTime = (v) => v ? new Date(v).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "—";
const initials = (name="") => name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
const demoEmployees = [
  {id:"demo-1",employee_code:"GSB001",full_name:"Amit Sharma",department:"Operations",phone:"",status:"active"},
  {id:"demo-2",employee_code:"GSB002",full_name:"Priya Das",department:"Accounts",phone:"",status:"active"},
  {id:"demo-3",employee_code:"GSB003",full_name:"Rahul Verma",department:"IT Support",phone:"",status:"active"},
  {id:"demo-4",employee_code:"GSB004",full_name:"Neha Singh",department:"Operations",phone:"",status:"active"},
  {id:"demo-5",employee_code:"GSB005",full_name:"Sanjay Roy",department:"Sales",phone:"",status:"active"}
];
const demoShifts = [
  {id:"s1",name:"Morning",start_time:"06:00",end_time:"14:00",grace_minutes:10},
  {id:"s2",name:"General",start_time:"09:00",end_time:"18:00",grace_minutes:10},
  {id:"s3",name:"Evening",start_time:"14:00",end_time:"22:00",grace_minutes:10},
  {id:"s4",name:"Night",start_time:"22:00",end_time:"06:00",grace_minutes:10}
];

function App(){
  const [session,setSession] = useState(null);
  const [page,setPage] = useState("Dashboard");
  const [loading,setLoading] = useState(true);
  const [demo,setDemo] = useState(!isConfigured);
  const [loginEmail,setLoginEmail] = useState("rakesh15591@gmail.com");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [employees,setEmployees] = useState(demoEmployees);
  const [shifts,setShifts] = useState(demoShifts);
  const [attendance,setAttendance] = useState([]);
  const [leaves,setLeaves] = useState([]);
  const [search,setSearch] = useState("");
  const [modal,setModal] = useState("");
  const [saving,setSaving] = useState(false);
  const [toast,setToast] = useState("");
  const [form,setForm] = useState({});
  const [selectedDate,setSelectedDate] = useState(today());

  useEffect(()=>{
    if(!isConfigured){setLoading(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(demo){setLoading(false);return;}
    if(!session){setEmployees([]);setAttendance([]);setShifts([]);setLeaves([]);return;}
    refresh();
  },[session,demo]);

  async function refresh(){
    setLoading(true);
    const [e,a,s,l] = await Promise.all([
      supabase.from("employees").select("*").order("full_name"),
      supabase.from("attendance").select("*, employees(full_name,employee_code), shifts(name)").order("work_date",{ascending:false}).limit(1000),
      supabase.from("shifts").select("*").order("name"),
      supabase.from("leave_requests").select("*, employees(full_name,employee_code)").order("created_at",{ascending:false})
    ]);
    const err=[e,a,s,l].find(x=>x.error)?.error;
    if(err) setError(err.message);
    setEmployees(e.data||[]);setAttendance(a.data||[]);setShifts(s.data||[]);setLeaves(l.data||[]);
    setLoading(false);
  }

  async function signIn(ev){
    ev.preventDefault();setError("");
    if(!isConfigured){setDemo(true);return;}
    const {error}=await supabase.auth.signInWithPassword({email:loginEmail,password});
    if(error)setError(error.message);
  }
  async function signOut(){if(!demo) await supabase.auth.signOut();setSession(null);}

  const todayRows = attendance.filter(a=>a.work_date===selectedDate);
  const presentIds = new Set(todayRows.map(a=>a.employee_id));
  const activeEmployees=employees.filter(e=>e.status==="active");
  const present=todayRows.length;
  const absent=Math.max(0,activeEmployees.length-presentIds.size);
  const late=todayRows.filter(a=>a.status==="late").length;
  const filteredEmployees=employees.filter(e=>(e.full_name+" "+e.employee_code+" "+(e.department||"")).toLowerCase().includes(search.toLowerCase()));

  function notify(msg){setToast(msg);setTimeout(()=>setToast(""),2800);}
  function openModal(type,initial={}){setForm(initial);setModal(type);setError("");}
  async function saveEmployee(ev){
    ev.preventDefault();setSaving(true);setError("");
    const payload={employee_code:form.employee_code,full_name:form.full_name,department:form.department||null,phone:form.phone||null,shift_id:form.shift_id||null,status:form.status||"active"};
    let result= demo ? null : (form.id ? await supabase.from("employees").update(payload).eq("id",form.id) : await supabase.from("employees").insert(payload));
    if(result?.error){setError(result.error.message);setSaving(false);return;}
    if(demo){setEmployees(old=>form.id?old.map(x=>x.id===form.id?{...x,...payload}:x):[...old,{id:crypto.randomUUID(),...payload}]);}
    else await refresh();
    setSaving(false);setModal("");notify("Employee saved");
  }
  async function saveShift(ev){
    ev.preventDefault();setSaving(true);setError("");
    const payload={name:form.name,start_time:form.start_time,end_time:form.end_time,grace_minutes:Number(form.grace_minutes||0)};
    const result=demo?null:(form.id?await supabase.from("shifts").update(payload).eq("id",form.id):await supabase.from("shifts").insert(payload));
    if(result?.error){setError(result.error.message);setSaving(false);return;}
    if(demo)setShifts(old=>form.id?old.map(x=>x.id===form.id?{...x,...payload}:x):[...old,{id:crypto.randomUUID(),...payload}]);else await refresh();
    setSaving(false);setModal("");notify("Shift saved");
  }
  async function saveAttendance(ev){
    ev.preventDefault();setSaving(true);setError("");
    const employee=employees.find(e=>e.id===form.employee_id);
    const shift=shifts.find(s=>s.id===form.shift_id);
    const lateFlag=shift && form.punch_in && form.punch_in>shift.start_time && (mins(form.punch_in)-mins(shift.start_time)>Number(shift.grace_minutes||0));
    const payload={employee_id:form.employee_id,shift_id:form.shift_id||null,work_date:form.work_date||today(),punch_in:form.punch_in||null,punch_out:form.punch_out||null,status:lateFlag?"late":(form.status||"present"),source:"manual"};
    const result=demo?null:await supabase.from("attendance").upsert(payload,{onConflict:"employee_id,work_date"});
    if(result?.error){setError(result.error.message);setSaving(false);return;}
    if(demo)setAttendance(old=>[...old.filter(x=>!(x.employee_id===payload.employee_id&&x.work_date===payload.work_date)),{id:crypto.randomUUID(),...payload,employees:{full_name:employee?.full_name,employee_code:employee?.employee_code},shifts:{name:shift?.name}}]);else await refresh();
    setSaving(false);setModal("");notify("Attendance saved");
  }
  async function updateLeave(id,status){
    if(demo){setLeaves(old=>old.map(x=>x.id===id?{...x,status}:x));return;}
    const {error}=await supabase.from("leave_requests").update({status}).eq("id",id);
    if(error)setError(error.message);else refresh();
  }
  function exportCSV(rows,filename){
    const csv=[Object.keys(rows[0]||{}).join(","),...rows.map(r=>Object.values(r).map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  }
  const chartData=useMemo(()=>Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(6-i));const key=d.toISOString().slice(0,10);
    return {day:d.toLocaleDateString(undefined,{weekday:"short"}),present:attendance.filter(a=>a.work_date===key).length};
  }),[attendance]);

  if(loading)return <div className="center-screen"><div className="spinner"/>Loading GSB Attendance…</div>;
  if(!demo&&!session)return <div className="login-wrap"><div className="login-card">
    <div className="brand-mark">GSB</div><p className="eyebrow">WORKFORCE MANAGEMENT</p><h1>Welcome back</h1><p className="muted">Sign in to your GSB Attendance admin account.</p>
    <form onSubmit={signIn} className="form-stack"><label>Email address<input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="error">{error}</div>}<button className="primary full">Sign in</button></form>
    <p className="tiny muted">Admin account must first be created in Supabase Authentication. See SETUP.md.</p>
  </div></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark small">GSB</div><div><b>GSB Attendance</b><small>Admin workspace</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([label,Icon])=><button key={label} className={`nav-item ${page===label?"active":""}`} onClick={()=>setPage(label)}><Icon size={18}/><span>{label}</span>{label==="Leave requests"&&leaves.filter(x=>x.status==="pending").length>0&&<i>{leaves.filter(x=>x.status==="pending").length}</i>}</button>)}
      <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">GA</div><div><b>GSB Admin</b><small>{demo?"Demo preview":session?.user?.email}</small></div></div><button className="nav-item" onClick={signOut}><LogOut size={18}/>Sign out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">GSB WORKSPACE / {page.toUpperCase()}</p><h1>{page}</h1></div><div className="top-actions"><span className={`mode-pill ${demo?"demo":"live"}`}>{demo?"Demo preview":"Live database"}</span><div className="avatar">GA</div></div></header>
      {demo&&<div className="notice"><CircleAlert size={17}/><span><b>Demo mode:</b> sample data only. Connect Supabase to save real employee and attendance records.</span></div>}
      {error&&<div className="notice warning"><CircleAlert size={17}/><span>{error}</span><button className="icon-btn" onClick={()=>setError("")}><X size={16}/></button></div>}
      {page==="Dashboard"&&<Dashboard employees={activeEmployees} present={present} absent={absent} late={late} chartData={chartData} todayRows={todayRows} onEmployees={()=>setPage("Employees")} onShifts={()=>setPage("Shifts")} onDevice={()=>setPage("Device integration")} />}
      {page==="Employees"&&<section className="panel"><div className="panel-head"><div><h2>Employees</h2><p>Manage your team directory</p></div><div className="actions"><button className="secondary" onClick={()=>exportCSV(filteredEmployees.map(({employee_code,full_name,department,phone,status})=>({employee_code,full_name,department,phone,status})),"gsb-employees.csv")}><Download size={16}/>Export</button><button className="primary" onClick={()=>openModal("employee")}><Plus size={17}/>Add employee</button></div></div><SearchBox value={search} onChange={setSearch}/><div className="table-wrap"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Phone</th><th>Status</th><th></th></tr></thead><tbody>{filteredEmployees.map(e=><tr key={e.id}><td><div className="person"><div className="avatar">{initials(e.full_name)}</div><b>{e.full_name}</b></div></td><td>{e.employee_code}</td><td>{e.department||"—"}</td><td>{e.phone||"—"}</td><td><span className={`status ${e.status}`}>{e.status}</span></td><td><button className="text-btn" onClick={()=>openModal("employee",e)}>Edit</button></td></tr>)}</tbody></table>{!filteredEmployees.length&&<Empty text="No employees found"/></div></section>}
      {page==="Attendance"&&<section className="panel"><div className="panel-head"><div><h2>Attendance records</h2><p>Daily punches and attendance status</p></div><div className="actions"><input className="date-input" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/><button className="secondary" onClick={()=>exportCSV(todayRows.map(a=>({date:a.work_date,employee:a.employees?.full_name||employees.find(e=>e.id===a.employee_id)?.full_name,employee_id:a.employees?.employee_code||employees.find(e=>e.id===a.employee_id)?.employee_code,punch_in:a.punch_in,punch_out:a.punch_out,status:a.status,source:a.source})),"gsb-attendance.csv")}><Download size={16}/>Export</button><button className="primary" onClick={()=>openModal("attendance",{work_date:selectedDate,status:"present"})}><Plus size={17}/>Add punch</button></div></div><div className="stats-row"><MiniStat label="Present" value={todayRows.length}/><MiniStat label="Late" value={late}/><MiniStat label="Absent" value={absent}/></div><div className="table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>Shift</th><th>First in</th><th>Last out</th><th>Status</th><th>Source</th></tr></thead><tbody>{todayRows.map(a=><tr key={a.id}><td>{a.employees?.full_name||employees.find(e=>e.id===a.employee_id)?.full_name||"Employee"}</td><td>{a.work_date}</td><td>{a.shifts?.name||shifts.find(s=>s.id===a.shift_id)?.name||"—"}</td><td>{a.punch_in||"—"}</td><td>{a.punch_out||"—"}</td><td><span className={`status ${a.status}`}>{a.status}</span></td><td>{a.source||"device"}</td></tr>)}</tbody></table>{!todayRows.length&&<Empty text="No attendance records for this date. Add a manual punch or connect the biometric device."/ >}</div></section>}
      {page==="Shifts"&&<section className="panel"><div className="panel-head"><div><h2>Shift management</h2><p>Configure working hours and grace periods</p></div><button className="primary" onClick={()=>openModal("shift",{start_time:"09:00",end_time:"18:00",grace_minutes:10})}><Plus size={17}/>Add shift</button></div><div className="shift-grid">{shifts.map(s=><div className="shift-card" key={s.id}><div className="shift-icon"><Clock3/></div><h3>{s.name}</h3><b>{s.start_time} – {s.end_time}</b><p>{s.grace_minutes} minute grace period</p><button className="text-btn" onClick={()=>openModal("shift",s)}>Edit shift</button></div>)}</div><p className="helper">Overnight shifts (for example, 22:00–06:00) are supported in the schedule. Attendance duration reporting can be extended with your payroll rules.</p></section>}
      {page==="Leave requests"&&<section className="panel"><div className="panel-head"><div><h2>Leave requests</h2><p>Review and approve employee leave</p></div></div><div className="table-wrap"><table><thead><tr><th>Employee</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>{leaves.map(l=><tr key={l.id}><td>{l.employees?.full_name||"Employee"}</td><td>{l.start_date}</td><td>{l.end_date}</td><td>{l.reason||"—"}</td><td><span className={`status ${l.status}`}>{l.status}</span></td><td>{l.status==="pending"?<div className="actions"><button className="approve" onClick={()=>updateLeave(l.id,"approved")}><Check size={15}/></button><button className="reject" onClick={()=>updateLeave(l.id,"rejected")}><X size={15}/></button></div>:"—"}</td></tr>)}</tbody></table>{!leaves.length&&<Empty text="No leave requests yet"/></div></section>}
      {page==="Device integration"&&<section className="panel"><div className="panel-head"><div><h2>Biometric device integration</h2><p>Team Office BIO-PARK attendance sync</p></div><span className="mode-pill demo">Not connected</span></div><div className="device-card"><div className="device-art"><Fingerprint size={48}/></div><div><h3>BIO-PARK face terminal</h3><p className="muted">Device ID: 1 · Firmware: ai518_fp26v_v2.13</p><p className="muted">Serial number: A250600743</p><p className="muted">Local IP shown on device: 192.168.0.26</p></div></div><div className="notice"><ShieldCheck size={18}/><span>Integration is pending. This build does not connect to the terminal yet. We need the vendor's supported export format, SDK or cloud API documentation before enabling sync.</span></div><h3>Integration checklist</h3><ul className="check-list"><li><Check/>Device model and firmware recorded</li><li><Check/>Employee and shift database ready</li><li><CircleAlert/>Obtain Team Office desktop export instructions or cloud API credentials</li><li><CircleAlert/>Map device user IDs to GSB employee IDs</li><li><CircleAlert/>Test duplicate prevention and missed punches</li></ul><p className="helper">Never expose the device on the public internet or share administrator passwords. Use a secured local connector or vendor-supported cloud integration.</p></section>}
      {page==="Settings"&&<section className="panel"><h2>Settings</h2><p>Organization: GSB Attendance</p><p>Administrator: rakesh15591@gmail.com</p><p>Capacity target: 100 employees</p></section>}
      <footer>© {new Date().getFullYear()} GSB Attendance <span>Secure workforce management</span></footer>
    </main>
    {modal&&<Modal title={modal==="employee"?"Employee details":modal==="shift"?"Shift details":"Add attendance punch"} onClose={()=>setModal("")}>
      {modal==="employee"&&<form onSubmit={saveEmployee} className="form-stack"><label>Employee ID<input required value={form.employee_code||""} onChange={e=>setForm({...form,employee_code:e.target.value})} placeholder="GSB006"/></label><label>Full name<input required value={form.full_name||""} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>Department<input value={form.department||""} onChange={e=>setForm({...form,department:e.target.value})}/></label><label>Phone<input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Assigned shift<select value={form.shift_id||""} onChange={e=>setForm({...form,shift_id:e.target.value})}><option value="">Not assigned</option>{shifts.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Status<select value={form.status||"active"} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><FormError error={error}/><button className="primary full" disabled={saving}>{saving?"Saving…":"Save employee"}</button></form>}
      {modal==="shift"&&<form onSubmit={saveShift} className="form-stack"><label>Shift name<input required value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="two-col"><label>Start time<input type="time" required value={form.start_time||""} onChange={e=>setForm({...form,start_time:e.target.value})}/></label><label>End time<input type="time" required value={form.end_time||""} onChange={e=>setForm({...form,end_time:e.target.value})}/></label></div><label>Grace period (minutes)<input type="number" min="0" max="180" value={form.grace_minutes??10} onChange={e=>setForm({...form,grace_minutes:e.target.value})}/></label><FormError error={error}/><button className="primary full" disabled={saving}>{saving?"Saving…":"Save shift"}</button></form>}
      {modal==="attendance"&&<form onSubmit={saveAttendance} className="form-stack"><label>Employee<select required value={form.employee_id||""} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select employee</option>{activeEmployees.map(e=><option value={e.id} key={e.id}>{e.employee_code} — {e.full_name}</option>)}</select></label><label>Shift<select value={form.shift_id||""} onChange={e=>setForm({...form,shift_id:e.target.value})}><option value="">Select shift</option>{shifts.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Date<input type="date" required value={form.work_date||today()} onChange={e=>setForm({...form,work_date:e.target.value})}/></label><div className="two-col"><label>Punch in<input type="time" value={form.punch_in||""} onChange={e=>setForm({...form,punch_in:e.target.value})}/></label><label>Punch out<input type="time" value={form.punch_out||""} onChange={e=>setForm({...form,punch_out:e.target.value})}/></label></div><FormError error={error}/><button className="primary full" disabled={saving}>{saving?"Saving…":"Save attendance"}</button></form>}
    </Modal>}
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function mins(t){const [h,m]=t.split(":").map(Number);return h*60+m;}
function SearchBox({value,onChange}){return <div className="searchbox"><Search size={17}/><input placeholder="Search employees…" value={value} onChange={e=>onChange(e.target.value)}/></div>}
function Empty({text}){return <div className="empty"><Users size={25}/>{text}</div>}
function FormError({error}){return error?<div className="error">{error}</div>:null}
function MiniStat({label,value}){return <div className="mini-stat"><span>{label}</span><b>{value}</b></div>}
function Dashboard({employees,present,absent,late,chartData,todayRows,onEmployees,onShifts,onDevice}){
  return <><div className="welcome"><div><h2>Good day, GSB Admin 👋</h2><p>Here’s your team's attendance overview.</p></div><div className="date-chip"><CalendarDays size={16}/>{new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"short",year:"numeric"})}</div></div>
    <div className="stat-grid"><Stat icon={Users} label="Total employees" value={employees.length} tone="blue"/><Stat icon={UserCheck} label="Present today" value={present} tone="green"/><Stat icon={UserMinus} label="Absent today" value={absent} tone="orange"/><Stat icon={AlarmClock} label="Late arrivals" value={late} tone="purple"/></div>
    <div className="dashboard-grid"><div className="panel chart-panel"><div className="panel-head"><div><h2>Attendance trend</h2><p>Daily recorded punches · Last 7 days</p></div><Activity size={20} className="muted"/></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eef4"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="present" fill="#2563eb" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div>
      <div className="panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Common admin tasks</p></div></div><button className="quick-action" onClick={onEmployees}><Users/>Manage employees <span>→</span></button><button className="quick-action" onClick={onShifts}><Clock3/>Configure shifts <span>→</span></button><button className="quick-action" onClick={onDevice}><Fingerprint/>Connect device <span>→</span></button></div></div>
    <div className="panel recent"><div className="panel-head"><div><h2>Today's attendance</h2><p>Latest recorded attendance</p></div></div>{todayRows.length?<div className="table-wrap"><table><thead><tr><th>Employee</th><th>First in</th><th>Last out</th><th>Status</th></tr></thead><tbody>{todayRows.slice(0,6).map(a=><tr key={a.id}><td>{a.employees?.full_name||"Employee"}</td><td>{a.punch_in||"—"}</td><td>{a.punch_out||"—"}</td><td><span className={`status ${a.status}`}>{a.status}</span></td></tr>)}</tbody></table></div>:<Empty text="Attendance records will appear here once synced or entered."/>}</div>
  </>;
}
function Stat({icon:Icon,label,value,tone}){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div><span>{label}</span><b>{value}</b></div></div>}
function Modal({title,onClose,children}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X/></button></div>{children}</div></div>}
