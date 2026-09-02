import Image from "next/image";

export default function SiteLogo({src,site,className="h-9 w-9"}:{src:string;site:string;className?:string}) {
  if (!src) return null;
  return <Image unoptimized src={src} alt={`${site} logo`} width={40} height={40} className={`${className} rounded-lg object-contain`} />;
}
