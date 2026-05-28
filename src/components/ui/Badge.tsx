import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
