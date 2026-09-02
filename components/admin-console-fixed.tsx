"use client";

import { useMemo, useState } from "react";
import ThemeToggle from "./theme-toggle";
import SiteLogo from "./site-logo";

type User = { id:string; username:string; email:string; role:string; is_primary:number; status:string; quota_bytes:number; used_bytes:number; file_count:number };
type Stats = { users:number; active:number; suspended:number; admins:number; files:number; bytes:number };
type Log = { action:string; created_at:string; ip_address:string|null };
type Settings = { websiteName:string; logoUrl:string; defaultQuotaBytes:number; maxUploadBytes:number; publicRegistration:boolean };

const fmt=(n:number)=>n<1048576?`${(n/1024).toFixed(1)} KB`:n<1073741824?`${(n/1048576).toFixed(1)} MB`:`${(n/1073741824).toFixed(2)} GB`;
async function csrf(){const response=await fetch("/api/auth/csrf");return (await response.json()).token as string;}

export default function AdminConsole({admin,theme,stats,users,logs,settings}:{admin:string;theme:"light"|"dark";stats:Stats;users:User[];logs:Log[];settings:Settings}){
  const [view,setView]=useState("dashboard");
  const [query,setQuery]=useState("");
  const [notice,setNotice]=useState("");
  const filtered=useMemo(()=>users.filter(user=>`${user.username} ${user.email}`.toLowerCase().includes(query.toLowerCase())),[users,query]);
  async function toggleUser(user:User){const response=await fetch(`/api/admin/users/${user.id}`,{method:"PATCH",headers:{"content-type":"application/json","x-csrf-token":await csrf()},body:JSON.stringify({status:user.status==="ACTIVE"?"SUSPENDED":"ACTIVE"})});setNotice(response.ok?"User updated":"Unable to update user");if(response.ok)setTimeout(()=>location.reload(),500);}
  async function saveSettings(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget),file=form.get("logoFile") as File;let logoUrl=String(form.get("logoUrl")||settings.logoUrl);if(file?.size){if(file.size>1048576){setNotice("Logo files must be 1 MB or smaller");return;}logoUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});}const response=await fetch("/api/admin/settings",{method:"PATCH",headers:{"content-type":"application/json","x-csrf-token":await csrf()},body:JSON.stringify({websiteName:form.get("websiteName"),logoUrl,defaultQuotaBytes:Number(form.get("quota"))*1073741824,maxUploadBytes:Number(form.get("maxUpload"))*1048576,publicRegistration:form.get("registration")==="on"})});setNotice(response.ok?"Settings saved — reload to see branding changes":"Unable to save settings");}
  const nav=[["dashboard","◈ Dashboard"],["users","♙ Users"],["storage","▣ Storage"],["security","⌾ Security"],["settings","⚙ App settings"],["audit","≡ Audit log"]];
  return <div className="theme-shell min-h-screen bg-slate-50 md:flex" data-theme={theme}>
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
      <a href="/files" className="flex items-center gap-2 text-lg font-extrabold"><SiteLogo src={settings.logoUrl} site={settings.websiteName} className="h-8 w-8"/>{settings.websiteName}</a>
      <p className="mt-1 pl-10 text-[9px] uppercase tracking-[.18em] text-slate-400">admin console</p>
      <nav className="mt-10 space-y-1">{nav.map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${view===key?"bg-mint text-vault":"text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}</nav>
      <div className="mt-auto"><p className="border-t border-slate-100 pt-4 text-xs text-slate-400">✦ AES-256-GCM encrypted</p></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-10"><b className="capitalize">{view}</b><div className="flex items-center gap-4"><ThemeToggle initialTheme={theme}/><a href="/files" className="text-sm font-semibold text-slate-500">My files</a><span className="avatar purple">{admin.slice(0,2).toUpperCase()}</span></div></header>
      <div className="mx-auto max-w-7xl p-5 md:p-10">{notice&&<p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {view==="dashboard"&&<><div className="eyebrow">System overview</div><h1 className="mt-2 text-3xl font-extrabold">Admin dashboard</h1><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Total users",stats.users],["Active users",stats.active],["Stored files",stats.files],["Storage used",fmt(stats.bytes||0)]].map(([label,value])=><div className="card p-5" key={label}><span className="text-xs text-slate-500">{label}</span><strong className="mt-3 block text-3xl">{value}</strong></div>)}</div></>}
        {view==="users"&&<><div className="eyebrow">Manage access</div><h1 className="mt-2 text-3xl font-extrabold">Users</h1><div className="card mt-7 overflow-hidden"><div className="border-b p-4"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search users…" className="w-full max-w-sm rounded-lg border p-2"/></div>{filtered.map(user=><div key={user.id} className="flex items-center gap-4 border-b p-4"><div className="min-w-0 flex-1"><b>{user.username}</b><span className="block text-xs text-slate-400">{user.email} · {fmt(user.used_bytes)} / {fmt(user.quota_bytes)}</span></div><span className="text-xs">{user.is_primary?"Primary admin":user.role}</span>{user.is_primary?<span className="text-xs text-slate-400">Protected</span>:<button onClick={()=>toggleUser(user)} className="text-xs font-bold text-vault">{user.status==="ACTIVE"?"Suspend":"Reactivate"}</button>}</div>)}</div></>}
        {view==="storage"&&<StatusPanel title="Storage" rows={[["Encrypted files",String(stats.files)],["Storage used",fmt(stats.bytes||0)],["Default quota",fmt(settings.defaultQuotaBytes)],["Maximum upload",fmt(settings.maxUploadBytes)]]}/>} 
        {view==="security"&&<StatusPanel title="Security" rows={[["File encryption","AES-256-GCM enabled"],["Password hashing","Argon2id"],["Sessions","HTTP-only · SameSite=Lax"],["Rate limiting","Enabled"]]}/>} 
        {view==="audit"&&<StatusPanel title="Audit log" rows={logs.map(log=>[log.action,new Date(log.created_at).toLocaleString()])}/>} 
        {view==="settings"&&<form onSubmit={saveSettings} className="max-w-2xl"><div className="eyebrow">Workspace</div><h1 className="mt-2 text-3xl font-extrabold">App settings</h1><div className="card mt-7 space-y-4 p-6"><label className="block font-semibold">Website name<input name="websiteName" defaultValue={settings.websiteName} className="mt-2 w-full rounded-lg border p-3"/></label><div className="rounded-lg border p-4"><b className="block">Logo</b><p className="mt-1 text-xs text-slate-400">Upload an image (max 1 MB) or enter an image URL.</p><input name="logoFile" type="file" accept="image/*" className="mt-3 block w-full text-sm"/><input name="logoUrl" type="url" defaultValue={settings.logoUrl.startsWith("data:")?"":settings.logoUrl} placeholder="https://example.com/logo.png" className="mt-3 w-full rounded-lg border p-3"/></div><label className="block font-semibold">Default quota (GB)<input name="quota" type="number" defaultValue={settings.defaultQuotaBytes/1073741824} className="mt-2 w-full rounded-lg border p-3"/></label><label className="block font-semibold">Maximum upload (MB)<input name="maxUpload" type="number" defaultValue={settings.maxUploadBytes/1048576} className="mt-2 w-full rounded-lg border p-3"/></label><label className="flex gap-3"><input name="registration" type="checkbox" defaultChecked={settings.publicRegistration}/> Public registration</label><button className="button green">Save changes</button></div></form>}
      </div>
    </main>
  </div>;
}

function StatusPanel({title,rows}:{title:string;rows:Array<[string,string]>}){return <><div className="eyebrow">Admin control</div><h1 className="mt-2 text-3xl font-extrabold">{title}</h1><div className="mt-7 max-w-3xl space-y-3">{rows.map(([label,value])=><div key={label} className="card flex justify-between p-5"><b>{label}</b><span className="text-slate-500">{value}</span></div>)}</div></>}
