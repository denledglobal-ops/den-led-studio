import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function POST(request:Request){
 try{
  const s=await createClient();const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const body=await request.json();const organizationId=String(body.organizationId||"");const amount=Number(body.amount);
  if(!organizationId||!Number.isInteger(amount)||amount<=0||amount>100000)return NextResponse.json({error:"Geçersiz kredi miktarı."},{status:400});
  const {error}=await s.rpc("admin_grant_credits",{target_org:organizationId,credit_amount:amount,note:"admin_grant"});
  if(error)return NextResponse.json({error:error.message},{status:error.message.includes("unauthorized")?403:400});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Kredi işlemi tamamlanamadı."},{status:500})}
}