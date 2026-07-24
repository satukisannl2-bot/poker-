import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
export async function POST(req:NextRequest){
 const token=req.headers.get("authorization")?.replace("Bearer ",""),url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!stripe||!token||!url||!key)return NextResponse.json({error:"設定が未完了です"},{status:400});
 const admin=createClient(url,key),{data:{user}}=await admin.auth.getUser(token);if(!user)return NextResponse.json({error:"ログインしてください"},{status:401});
 const {data}=await admin.from("profiles").select("stripe_customer_id").eq("id",user.id).single();if(!data?.stripe_customer_id)return NextResponse.json({error:"有効な契約がありません"},{status:404});
 const portal=await stripe.billingPortal.sessions.create({customer:data.stripe_customer_id,return_url:`${process.env.NEXT_PUBLIC_APP_URL??req.nextUrl.origin}/account`});
 return NextResponse.json({url:portal.url});
}
