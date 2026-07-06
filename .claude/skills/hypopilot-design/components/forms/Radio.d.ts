/** Bouton radio contrôlé (un par option). */
export interface RadioProps {
  label?: React.ReactNode;
  checked?: boolean;
  /** Appelé avec true quand sélectionné */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Radio(props: RadioProps): JSX.Element;
