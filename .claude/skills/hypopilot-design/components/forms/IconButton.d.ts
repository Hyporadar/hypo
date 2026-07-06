/** Bouton icône rond (44px min de zone tactile en md/lg). */
export interface IconButtonProps {
  /** Libellé accessible (aria-label), obligatoire */
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  /** L'icône (SVG Lucide 20px) */
  children?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
