// This is a deployment attestation, not a way to change Google's billing tier.
export function assertFreeGemini({verified,enabled=true,model,fallbackModel}) {
  if(!enabled)throw new Error("AI suggestions are paused. Your Library and reading tracker still work.");
  if(!verified)throw new Error("AI suggestions are paused until free-tier billing is verified. Your Library and reading tracker still work.");
  const allowed=new Set(["gemini-3.5-flash-lite","gemini-3.1-flash-lite"]);
  if(!allowed.has(model)||!allowed.has(fallbackModel))throw new Error("AI model is not approved for this free-tier deployment.");
}

export function createQuotaGuard({now=Date.now,cooldownMs=60000}={}){
  let until=0;
  return {
    check(){if(now()<until)throw new Error("Provider quota reached. Wait a minute and try again; your saved reading data is safe.");},
    observe(status){if(status===429)until=now()+cooldownMs;},
  };
}
