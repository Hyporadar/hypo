/** Wordmark officiel HypoRadar — seule représentation autorisée du logo. */
export interface WordmarkProps {
  /** Taille de police en px (défaut 28) */
  size?: number;
  /** true sur fond vert-700 / sombre */
  onDark?: boolean;
  style?: React.CSSProperties;
}
export declare function Wordmark(props: WordmarkProps): JSX.Element;
