/** Badge de statut (majuscules, pilule). */
export interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'brand';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
