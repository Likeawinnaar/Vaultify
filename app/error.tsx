"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="grid min-h-screen place-items-center p-6"><div className="card max-w-md p-8 text-center"><div className="eyebrow">Something went wrong</div><h1 className="mt-2 text-2xl font-extrabold">Vaultify could not complete that request.</h1><p className="mt-2 text-sm text-slate-500">No internal details are shown here. Try again or check the server logs.</p><button className="button green mt-6" onClick={()=>reset()}>Try again</button></div></main>}

