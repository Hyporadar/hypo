// Normalisation pour recherche insensible à la casse ET aux accents :
// « Delémont » → « delemont », « Genève » → « geneve ». Utilisée par les
// autocompletes (prêteurs, localités) et pour la colonne SwissLocality.recherche.
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}
