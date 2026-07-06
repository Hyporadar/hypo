/** Étiquette filtrante / sélectionnable. */
export interface TagProps {
  selected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Tag(props: TagProps): JSX.Element;
