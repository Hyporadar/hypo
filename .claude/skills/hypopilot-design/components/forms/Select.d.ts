/** Liste déroulante native stylée. */
export interface SelectProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Chaînes ou {value, label} */
  options: Array<string | { value: string; label: string }>;
  value?: string;
  onChange?: (e: any) => void;
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
