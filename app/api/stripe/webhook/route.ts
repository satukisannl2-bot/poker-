import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
export async function POST(req:NextRequest){
 const secret=process.env.STRIPE_WEBHOOK_SECRET,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!stripe||!secret||!url||!key)return NextResponse.json({error:"設定が未完了です"},{status:503});
 let event;try{event=stripe.webhooks.constructEvent(await req.text(),req.headers.get("stripe-signature")??"",secret)}catch{return NextResponse.json({error:"署名が正しくありません"},{status:400})}
 const admin=createClient(url,key);
 if(event.type==="checkout.session.completed"){const s=event.data.object,userId=s.client_reference_id;if(userId)await admin.from("profiles").update({plan:"standard",subscription_status:"active",stripe_customer_id:String(s.customer),stripe_subscription_id:String(s.subscription)}).eq("id",userId)}
 if(event.type==="customer.subscription.deleted"){const s=event.data.object;await admin.from("profiles").update({plan:"free",subscription_status:"canceled"}).eq("stripe_subscription_id",s.id)}
 return NextResponse.json({received:true});
}
