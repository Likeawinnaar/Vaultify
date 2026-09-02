"use client";
import { useState } from "react";

export default function SetupForm(){
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(e.currentTarget);
    const body=Object.fromEntries(form.entries());
    if(String(body.password)!==String(body.confirmPassword)){
      setError("Passwords do not match");
      setBusy(false);
      return;
    }
    delete body.confirmPassword;
    const res=await fetch("/api/setup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,publicRegistration:form.get("publicRegistration")==="on",defaultQuotaBytes:Number(body.defaultQuotaBytes)*1073741824,maxUploadBytes:Number(body.maxUploadBytes)*1073741824})});
    const json=await res.json().catch(()=>({}));
    if(!res.ok){setError(json.error||"Unable to complete setup");setBusy(false);return;}
    location.href="/dashboard";
  }

  return <form onSubmit={submit} className="mt-6 space-y-4">
    <label className="block text-sm font-semibold">Website name<input name="websiteName" defaultValue="Vaultify" required className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Username<input name="username" required pattern="[a-zA-Z0-9_-]{3,32}" className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label><label className="block text-sm font-semibold">Email<input name="email" type="email" required className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label></div>
    <label className="block text-sm font-semibold">Password <span className="font-normal text-slate-400">(12+ characters)</span><input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label>
    <label className="block text-sm font-semibold">Confirm password<input name="confirmPassword" type="password" minLength={12} maxLength={128} required autoComplete="new-password" className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Default quota (GB)<input name="defaultQuotaBytes" type="number" defaultValue="25" min="1" required className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label><label className="block text-sm font-semibold">Max upload (GB)<input name="maxUploadBytes" type="number" defaultValue="5" min="1" required className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label></div>
    <label className="flex items-center gap-3 text-sm"><input name="publicRegistration" type="checkbox" defaultChecked/> Enable public registration</label>
    {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="button green w-full">{busy?"Creating vault…":"Create secure vault"}</button>
  </form>;
}
