/** Champ de saisie avec libellé, aide, erreur, préfixe/suffixe. */
export interface InputProps {
  label?: string;
  /** Texte d'aide sous le champ */
  hint?: string;
  /** Message d'erreur (remplace hint, bord rouge) */
  error?: string;
  /** Ex. « CHF » */
  prefix?: React.ReactNode;
  /** Ex. « % » */
  suffix?: React.ReactNode;
  /** Valeur chiffrée → police mono */
  mono?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: any) => void;
  type?: string;
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
