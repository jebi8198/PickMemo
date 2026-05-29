'use client';

import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './ConfirmProvider.module.css';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends Required<Omit<ConfirmOptions, 'danger'>> {
  danger: boolean;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? '확인',
        cancelLabel: options.cancelLabel ?? '취소',
        danger: options.danger ?? false,
        resolve,
      });
    });
  }, []);

  const close = (confirmed: boolean) => {
    if (!pending) return;
    pending.resolve(confirmed);
    setPending(null);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <div className={styles.overlay} role="presentation" onClick={() => close(false)}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title" className={styles.title}>{pending.title}</h2>
            <p className={styles.message}>{pending.message}</p>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => close(false)}>
                {pending.cancelLabel}
              </Button>
              <Button variant={pending.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
                {pending.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
}
