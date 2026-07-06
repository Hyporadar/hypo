/**
 * Bouton d'action HypoPilot. Pilule, vert Pilote.
 * @startingPoint section="Formulaires" subtitle="Boutons pilule — primaire, secondaire, ghost, danger" viewport="700x220"
 */
export interface ButtonProps {
  /** primary (vert), secondary (contour), ghost, danger */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Icône optionnelle (élément React, ex. SVG Lucide 20px) */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
