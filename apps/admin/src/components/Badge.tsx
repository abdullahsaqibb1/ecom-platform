import type { PropsWithChildren } from 'react';

interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<BadgeProps>) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
