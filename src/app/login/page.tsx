import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
export default async function LoginPage(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();if(data?.claims)redirect("/panel");return <main className="auth-page"><section className="auth-card"><div className="brand dark"><div className="brand-mark">S2</div><div><strong>Sindicato N°2</strong><small>Banco BICE</small></div></div><div><span className="eyebrow">ACCESO SEGURO</span><h1>Bienvenido</h1><p>Ingresa con tu correo registrado para acceder a la plataforma.</p></div><LoginForm/></section></main>}
