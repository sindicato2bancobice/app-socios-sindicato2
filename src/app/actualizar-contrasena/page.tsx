import { PasswordForm } from "./password-form";

export default function UpdatePasswordPage() {
  return <main className="auth-page"><section className="auth-card"><div className="brand dark"><div className="brand-mark">S2</div><div><strong>Sindicato N°2</strong><small>Banco BICE</small></div></div><div><span className="eyebrow">RECUPERACIÓN SEGURA</span><h1>Crea una contraseña nueva</h1><p>Utiliza al menos 10 caracteres y evita reutilizar una clave anterior.</p></div><PasswordForm/></section></main>;
}
