import {cookies} from "next/headers";
import {createClient} from "@supabase/supabase-js";
import {getReader} from "@/lib/auth/server";
import {readerDeniedResponse} from "@/lib/auth/http";
import {publicEnv} from "@/lib/env/public";
import {z} from "zod";
const headers={"Cache-Control":"private, no-store"};
const schema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("email"),email:z.email().max(254),password:z.string().min(1).max(1024)}).strict(),
  z.object({kind:z.literal("verify-delete"),password:z.string().min(1).max(1024)}).strict(),
]);
function freshClient(token){return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL,publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},...(token?{global:{headers:{Authorization:`Bearer ${token}`}}}:{})});}
export async function POST(request){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Check your account details."},{status:400,headers});
  try{const client=freshClient();const {data,error}=await client.auth.signInWithPassword({email:reader.user.email,password:parsed.data.password});
    if(error||data.user?.id!==reader.user.id)return Response.json({error:"Could not verify your password. Check it and try again."},{status:error?.status>=500?503:400,headers});
    if(parsed.data.kind==="verify-delete"){
      (await cookies()).set("vela-delete-verification",data.session.access_token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",maxAge:300,path:"/api/account"});
      return Response.json({verified:true},{headers});
    }
    // Use the cookie-backed PKCE client for email confirmation; the isolated
    // password check must not replace the reader's current browser session.
    const updated=await reader.supabase.auth.updateUser({email:parsed.data.email},{emailRedirectTo:new URL("/auth/callback?next=/settings",request.url).toString()});
    if(updated.error)return Response.json({error:"Your email change could not be confirmed. Please retry."},{status:503,headers});
    return Response.json({email:updated.data.user.email,pendingEmail:updated.data.user.new_email||null},{headers});
  }catch{return Response.json({error:"We couldn’t connect. Your input is still here; please try again."},{status:503,headers});}}
export async function DELETE(request){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  const value=await request.json().catch(()=>null);if(value?.confirmation!=="DELETE"||Object.keys(value).length!==1)return Response.json({error:"Type DELETE to confirm."},{status:400,headers});
  const cookieStore=await cookies();const token=cookieStore.get("vela-delete-verification")?.value;
  if(!token)return Response.json({error:"Verify your password again before deleting."},{status:401,headers});
  try{const client=freshClient(token);const verified=await client.auth.getUser(token);
    if(verified.error||verified.data.user?.id!==reader.user.id)return Response.json({error:"Verification expired. Verify your password again."},{status:401,headers});
    const result=await client.rpc("delete_reader_account",{confirmation:"DELETE"});
    if(result.error)return Response.json({error:result.error.code==="42501"?"Verification expired. Verify your password again.":"Deletion could not be confirmed. Please try again."},{status:result.error.code==="42501"?401:503,headers});
    cookieStore.set("vela-delete-verification","",{path:"/api/account",maxAge:0});
    await reader.supabase.auth.signOut({scope:"local"});
    return Response.json({deleted:true},{headers});
  }catch{return Response.json({error:"Deletion could not be confirmed. Please try again."},{status:503,headers});}}
