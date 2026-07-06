/** Carte de contenu. */
export interface CardProps {
  /** default (blanc), brand (vert-700, texte clair), alt (beige), alert (ambre — échéances) */
  tone?: 'default' | 'brand' | 'alt' | 'alert';
  padding?: number | string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
