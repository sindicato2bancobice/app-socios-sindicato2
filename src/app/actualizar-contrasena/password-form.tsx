"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10) return setMessage("La contraseña debe tener al menos 10 caracteres.");
    if (password !== confirmation) return setMessage("Las contraseñas no coinciden.");
    setLoading(true);
    setMessage("");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setMessage("El enlace venció o no fue posible actualizar la contraseña. Solicita uno nuevo.");
      setLoading(false);
      return;
    }
    router.replace("/panel");
    router.refresh();
  }

  return <form className="form" onSubmit={submit}><label>Nueva contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={10} autoComplete="new-password" required/></label><label>Repetir contraseña<input type="password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} minLength={10} autoComplete="new-password" required/></label>{message&&<div className="form-message">{message}</div>}<button className="button large full" disabled={loading}>{loading?"Guardando…":"Guardar nueva contraseña"}</button></form>;
}
