import Storefront from '@/components/storefront';
// One data-free detail shell works for every live D1 program, including new imports.
export function generateStaticParams(){return [{id:'_shell'}]}
export default async function Page({params}:{params:Promise<{id:string}>}){return <Storefront detailId={(await params).id}/>}
