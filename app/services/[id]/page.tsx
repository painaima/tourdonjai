import Storefront from '@/components/storefront';
export default async function Page({params}:{params:Promise<{id:string}>}){return <Storefront detailId={(await params).id}/>}
