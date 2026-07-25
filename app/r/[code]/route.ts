import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest,{params}:{params:Promise<{code:string}>}){
 const {code}=await params;
 const clean=code.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,16);
 return NextResponse.redirect(new URL(`/login?mode=signup${clean?`&ref=${encodeURIComponent(clean)}`:""}`,request.url));
}
