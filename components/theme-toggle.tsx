"use client";
import { useState } from "react";

async function csrf(){const response=await fetch("/api/auth/csrf");return (await response.json()).token as string;}

export default function ThemeToggle({initialTheme}:{initialTheme:"light"|"dark"}) {
  const [theme,setTheme]=useState(initialTheme);
  async function toggle(){
    const next=theme==="dark"?"light":"dark";
    document.querySelectorAll<HTMLElement>(".theme-shell").forEach((element)=>element.dataset.theme=next);
    setTheme(next);
    await fetch("/api/account/theme",{method:"PATCH",headers:{"content-type":"application/json","x-csrf-token":await csrf()},body:JSON.stringify({theme:next})});
  }
  return <button type="button" onClick={toggle} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold" aria-label={`Switch to ${theme==="dark"?"light":"dark"} mode`}>{theme==="dark"?"☀ Light":"☾ Dark"}</button>;
}
