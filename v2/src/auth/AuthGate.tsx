import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ShieldCheck, Swords } from "lucide-react";

export default function AuthGate({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<any>(null);
 const [ready,setReady]=useState(false);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [mode,setMode]=useState<"login"|"signup">("login");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!supabase){setReady(true);return}
  supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
  return ()=>subscription.unsubscribe();
 },[]);
 async function submit(e:FormEvent){
  e.preventDefault();if(!supabase){setMessage("Configure as variáveis do Supabase no arquivo .env.local para ativar o acesso.");return}
  setBusy(true);setMessage("");
  const result=mode==="login"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
  setBusy(false);setMessage(result.error?.message??(mode==="signup"?"Cadastro iniciado. Verifique seu e-mail para confirmar a conta.":""));
 }
 if(!ready)return <div className="auth-loading">Preparando seu dojo...</div>;
 if(!supabase||session)return <>{children}</>;
 return <div className="auth-screen"><div className="auth-card"><div className="brand auth-brand"><div className="brand-mark">道</div><div><b>DOJO DE BOLSO</b><span>VERSÃO 2.0</span></div></div><p className="eyebrow">SUA JORNADA COMEÇA AQUI</p><h1>{mode==="login"?"Bem-vindo de volta.":"Entre para o dojo."}</h1><p className="muted">Acesse sua área de estudos e acompanhe sua evolução no judô.</p><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label><label>Senha<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><button className="primary-button full" disabled={busy}>{busy?"Aguarde...":mode==="login"?"Entrar no meu dojo":"Criar minha conta"}</button></form>{message&&<p className="auth-message">{message}</p>}<button className="auth-toggle" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("")}}>{mode==="login"?"Ainda não tem conta? Criar cadastro":"Já tem conta? Entrar"}</button><div className="auth-safe"><ShieldCheck size={14}/> Autenticação segura pelo Supabase</div></div><div className="auth-decoration"><Swords size={38}/><span>DISCIPLINA · RESPEITO · EVOLUÇÃO</span></div></div>;
}
