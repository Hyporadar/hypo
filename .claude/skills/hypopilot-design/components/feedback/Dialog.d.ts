/** Boîte de dialogue modale. */
export interface DialogProps {
  open?: boolean;
  title?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  width?: number;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
