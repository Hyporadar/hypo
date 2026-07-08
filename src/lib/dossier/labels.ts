import fr from '../../../messages/fr.json'

// ─── Libellés FR des valeurs du dossier (panel admin, FR uniquement) ───
// Source unique : messages/fr.json → wizard.questions (mêmes libellés que
// le wizard client, pas de duplication).

type Tree = Record<string, unknown>
const QUESTIONS = (fr as Tree & { wizard: { questions: Tree } }).wizard.questions

/** Résout `usage.options.RESIDENCE_PRINCIPALE` dans wizard.questions. */
export function questionLabel(path: string): string {
  let node: unknown = QUESTIONS
  for (const segment of path.split('.')) {
    if (typeof node !== 'object' || node === null) return path
    node = (node as Tree)[segment]
  }
  return typeof node === 'string' ? node : path
}

/** Valeur d'enum → libellé via un bloc d'options ; valeur brute si absent. */
export function optionLabel(block: string, value: string | null | undefined): string {
  if (!value) return '—'
  const label = questionLabel(`${block}.${value}`)
  return label === `${block}.${value}` ? value : label
}
