/** Onglets soulignés. */
export interface TabsProps {
  /** Chaînes ou {value, label} */
  tabs: Array<string | { value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
