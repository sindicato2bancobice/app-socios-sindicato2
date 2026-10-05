'use client';

import { useFormStatus } from 'react-dom';
import { LoaderCircle } from 'lucide-react';
import styles from './pending-button.module.css';

export function PendingButton({label,pendingLabel}:{label:string;pendingLabel:string}){
  const {pending}=useFormStatus();
  return <>
    <button type="submit" className={`button ${styles.button}`} disabled={pending} aria-busy={pending}>
      {pending&&<LoaderCircle className={styles.spinner} size={18} aria-hidden="true"/>}
      {pending?pendingLabel:label}
    </button>
    <span role="status" aria-live="polite" className={styles.status}>
      {pending?'Procesando contactos. Espera a que termine antes de cerrar esta página.':''}
    </span>
  </>;
}
