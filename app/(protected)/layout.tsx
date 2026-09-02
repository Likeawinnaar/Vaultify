import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import SiteLogo from "@/components/site-logo";

export default async function ProtectedLayout({children}:{children:React.ReactNode}){
  const user=await requireUser();
  const site=getSetting("website_name","Vaultify"),logo=getSetting("logo_url","");
  return <div className="theme-shell min-h-screen bg-slate-50 md:flex" data-theme={user.theme}>
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
      <Link href="/files" className="flex items-center gap-2 text-lg font-extrabold tracking-tight"><SiteLogo src={logo} site={site} className="h-8 w-8"/>{site}</Link>
      <div className="mt-8 rounded-xl bg-slate-50 p-3 text-xs"><b>{user.username}</b><span className="mt-1 block text-slate-400">{user.role==="ADMIN"?"Administrator":"Personal vault"}</span></div>
      <nav className="mt-7 space-y-1"><Link className="block rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-vault" href="/files">▣ Files</Link>{user.role==="ADMIN"&&<Link className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50" href="/admin">⚙ Admin console</Link>}</nav>
      <div className="mt-auto"><p className="border-t border-slate-100 pt-4 text-xs text-slate-400">✦ Encrypted at rest<br/><span className="pl-4">AES-256-GCM · v2</span></p></div>
    </aside><main className="min-w-0 flex-1">{children}</main>
  </div>;
}
