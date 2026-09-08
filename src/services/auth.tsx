import { useEffect,useState,type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase,demoMode,configurationError,authRedirectUrl,friendlyError,passwordFlow } from './supabase';
import { profileFromRow } from './mapping';
import { demoProfile,type UserProfile } from './types';
const logo=`${import.meta.env.BASE_URL}branding/4418-impulse-emblem.png`;
export function AuthGate({children}:{children:(profile:UserProfile,signOut:()=>Promise<void>,updateProfile:(profile:UserProfile)=>void)=>ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[profile,setProfile]=useState<UserProfile|null>(null),[loading,setLoading]=useState(Boolean(supabase)),[error,setError]=useState(configurationError),[recovery,setRecovery]=useState(passwordFlow);
 useEffect(()=>{
  if(!supabase)return;let active=true;
  const {data}=supabase.auth.onAuthStateChange((event,next)=>{if(!active)return;setSession(next);if(!next){setProfile(null);setLoading(false);}if(event==='PASSWORD_RECOVERY')setRecovery(true);});
  void supabase.auth.getSession().then(({data,error})=>{if(!active)return;if(error){setError(friendlyError(error));setLoading(false);}else{setSession(data.session);if(!data.session)setLoading(false);}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(!session||!supabase)return;let active=true;setLoading(true);
  void supabase.from('profiles').select('*').eq('id',session.user.id).single().then(({data,error})=>{if(!active)return;if(error){setError('Could not load your team profile. Ask a mentor to check your account, then retry.');setProfile(null);}else{setProfile(profileFromRow(data));setError('');}setLoading(false);});
  return()=>{active=false;};
 },[session?.user.id]);
 const signOut=async()=>{if(!supabase)return;const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;setSession(null);setProfile(null);setRecovery(false);};
 if(demoMode)return children(demoProfile,async()=>{},()=>{});
 if(loading)return <AuthFrame><p role="status">Restoring your session…</p></AuthFrame>;
 if(configurationError)return <AuthFrame><p role="alert">{configurationError}</p></AuthFrame>;
 if(recovery&&session)return <PasswordForm done={()=>{setRecovery(false);history.replaceState(null,'',authRedirectUrl()+'#dashboard');}}/>;
 if(!session)return <Login error={error}/>;
 if(!profile||!profile.active)return <AuthFrame><p role="alert">{profile?'Your account is inactive. Ask a mentor to restore access.':error}</p><button className="secondary" onClick={()=>location.reload()}>Retry</button><button className="text-button" onClick={()=>void signOut().catch(e=>setError(friendlyError(e)))}>Sign out</button></AuthFrame>;
 return children(profile,signOut,setProfile);
}
function AuthFrame({children}:{children:ReactNode}){return <div className="auth-page"><section className="panel auth-card"><div className="brand auth-brand"><span className="brand-mark official-brand"><img src={logo} alt="Team 4418 IMPULSE rocket logo"/></span><div>4418<span>TEAM INVENTORY</span></div></div><h1>4418 Inventory</h1><p className="auth-intro">One team. Every part.</p>{children}</section></div>;}
function Login({error:initialError}:{error:string}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(initialError),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <AuthFrame><form className="auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase!.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}}>
 <label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
 {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <button className="primary" disabled={busy}>{busy?'Signing in…':'Sign In'}</button>
 <button className="text-button" disabled={busy} type="button" onClick={async()=>{if(!email.trim()){setError('Enter your email address first.');return;}setBusy(true);setError('');try{const {error}=await supabase!.auth.resetPasswordForEmail(email.trim(),{redirectTo:authRedirectUrl()+'?password-reset=1'});if(error)throw error;setMessage('If an account exists, a password reset email is on its way.');}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}}>Forgot password?</button>
 <small>Accounts are provided by your team’s mentors. Contact a mentor for an invitation.</small>
 </form></AuthFrame>;
}
function PasswordForm({done}:{done:()=>void}){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <AuthFrame><form className="auth-form" onSubmit={async e=>{e.preventDefault();if(password!==confirm){setError('Passwords must match.');return;}setBusy(true);const {error}=await supabase!.auth.updateUser({password});if(error)setError(friendlyError(error));else done();setBusy(false);}}><h2>Set your password</h2><label>New password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="primary" disabled={busy}>Save password</button></form></AuthFrame>;
}
