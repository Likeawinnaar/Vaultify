export default function SiteLogo({src,site,className="h-9 w-9"}:{src:string;site:string;className?:string}) {
  if (!src) return null;
  return <img src={src} alt={`${site} logo`} className={`${className} rounded-lg object-contain`} />;
}
