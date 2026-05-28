import React, { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className={`${styles.container} ${className}`}>
        {label && <label className={styles.label}>{label}</label>}
        <input ref={ref} className={`${styles.input} ${error ? styles.inputError : ''}`} {...props} />
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
