import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
export async function POST(req:NextRequest){
 if(!stripe)return NextResponse.json({error:"Stripeテストキーが未設定です"},{status:503});
 const token=req.headers.get("authorization")?.replace("Bearer ","");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,price=process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID;
 if(!token||!url||!key||!price)return NextResponse.json({error:"公開設定が未完了です"},{status:400});
 const supabase=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:{user}}=await supabase.auth.getUser(token);if(!user?.email)return NextResponse.json({error:"ログインしてください"},{status:401});
 const origin=process.env.NEXT_PUBLIC_APP_URL??req.nextUrl.origin;
 const session=await stripe.checkout.sessions.create({mode:"subscription",customer_email:user.email,line_items:[{price,quantity:1}],client_reference_id:user.id,metadata:{user_id:user.id,plan:"standard"},success_url:`${origin}/account?checkout=success`,cancel_url:`${origin}/pricing?checkout=cancel`});
 return NextResponse.json({url:session.url});
}
