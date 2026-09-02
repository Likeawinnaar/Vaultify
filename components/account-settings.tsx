"use client";

import { useState } from "react";

const fmt=(n:number)=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:n<1073741824?`${(n/1048576).toFixed(1)} MB`:`${(n/1073741824).toFixed(2)} GB`;
async function csrf(){const response=await fetch("/api/auth/csrf");return (await response.json()).token as string;}

export default function AccountSettings({user,used}:{user:{username:string;email:string;role:string;quota:number;createdAt:string};used:number}){
  const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null);
  const [busy,setBusy]=useState(false);

  async function updateProfile(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setNotice(null);
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/account/profile",{method:"PATCH",headers:{"content-type":"application/json","x-csrf-token":await csrf()},body:JSON.stringify({username:form.get("username"),email:form.get("email")})});
    const body=await response.json().catch(()=>({}));
    setNotice({text:response.ok?"Account details updated":body.error||"Unable to update account",error:!response.ok});
    setBusy(false);if(response.ok)setTimeout(()=>location.reload(),500);
  }

  async function updatePassword(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setNotice(null);
    const form=new FormData(event.currentTarget),next=String(form.get("newPassword")||""),confirm=String(form.get("confirmPassword")||"");
    if(next!==confirm){setNotice({text:"New passwords do not match",error:true});setBusy(false);return;}
    const response=await fetch("/api/account/password",{method:"PATCH",headers:{"content-type":"application/json","x-csrf-token":await csrf()},body:JSON.stringify({currentPassword:form.get("currentPassword"),newPassword:next})});
    const body=await response.json().catch(()=>({}));
    setNotice({text:response.ok?"Password changed securely":body.error||"Unable to change password",error:!response.ok});
    if(response.ok)event.currentTarget.reset();setBusy(false);
  }

  return <div className="mx-auto max-w-5xl p-5 md:p-10">
    <div className="eyebrow">Account</div><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Manage your account</h1><p className="mt-2 text-sm text-slate-500">Update your sign-in details and review your private storage.</p>
    {notice&&<div className={`mt-5 rounded-lg p-3 text-sm ${notice.error?"bg-red-50 text-red-800":"bg-emerald-50 text-emerald-800"}`}>{notice.text}</div>}
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <form onSubmit={updateProfile} className="card space-y-4 p-6"><h2 className="text-lg font-bold">Profile</h2><label className="block text-sm font-semibold">Username<input name="username" defaultValue={user.username} pattern="[a-zA-Z0-9_-]{3,32}" required className="mt-2 w-full rounded-lg border p-3"/></label><label className="block text-sm font-semibold">Email<input name="email" type="email" defaultValue={user.email} required className="mt-2 w-full rounded-lg border p-3"/></label><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Role: <b>{user.role}</b><br/>Member since: {new Date(user.createdAt).toLocaleDateString()}</div><button disabled={busy} className="button green">Save profile</button></form>
      <form onSubmit={updatePassword} className="card space-y-4 p-6"><h2 className="text-lg font-bold">Change password</h2><label className="block text-sm font-semibold">Current password<input name="currentPassword" type="password" required autoComplete="current-password" className="mt-2 w-full rounded-lg border p-3"/></label><label className="block text-sm font-semibold">New password<input name="newPassword" type="password" minLength={12} maxLength={128} required autoComplete="new-password" className="mt-2 w-full rounded-lg border p-3"/></label><label className="block text-sm font-semibold">Confirm new password<input name="confirmPassword" type="password" minLength={12} maxLength={128} required autoComplete="new-password" className="mt-2 w-full rounded-lg border p-3"/></label><button disabled={busy} className="button green">Change password</button></form>
    </div>
    <div className="card mt-5 p-6"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Storage</h2><p className="mt-1 text-sm text-slate-500">{fmt(used)} used of {fmt(user.quota)}</p></div><div className="text-right text-sm"><b>{Math.max(0,Math.round((1-used/user.quota)*100))}%</b><span className="block text-xs text-slate-400">available</span></div></div><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{width:`${Math.min(100,user.quota?used/user.quota*100:100)}%`}}/></div></div>
  </div>;
}
