/** Notification éphémère (fond encre, point de couleur). */
export interface ToastProps {
  tone?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
