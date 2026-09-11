import { createSuiteClient } from '../suite-auth';
const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const demoMode=import.meta.env.VITE_INVENTORY_MODE==='demo'||(!url&&!key);
export let configurationError=!demoMode&&(!url||!key)?'Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect this workspace.':'';
export const passwordFlow=/type=(invite|recovery)/.test(window.location.hash)||new URLSearchParams(window.location.search).has('password-reset');
// Dashboard invitations contain implicit token fragments; app-initiated resets use PKCE.
// The public key is intentionally browser-visible. RLS, not this key, authorizes data access.
export const supabase=(()=>{if(demoMode||configurationError)return null;try{return createSuiteClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:new URLSearchParams(window.location.hash.slice(1)).has('access_token')?'implicit':'pkce'}});}catch{configurationError='The Supabase project URL or public key is invalid. Check the build environment configuration.';return null;}})();
export function authRedirectUrl(){return new URL(import.meta.env.BASE_URL,window.location.href).origin+new URL(import.meta.env.BASE_URL,window.location.href).pathname;}
export function friendlyError(error:unknown):string {
 const detail=error instanceof Error?error.message:typeof error==='object'&&error!==null&&'message' in error?String(error.message):String(error);
 if(/fetch|network/i.test(detail))return 'Could not reach the shared workspace. Check your connection and try again.';
 if(/JWT|session|refresh.token/i.test(detail))return 'Your session expired. Please sign in again.';
 if(/42501|permission|row.level|not allowed/i.test(detail))return 'Your account does not have permission for this change.';
 return detail||'Something went wrong. Please try again.';
}
