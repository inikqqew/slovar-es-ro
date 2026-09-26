// Частые румынские слова, которые нередко печатают без диакритиков (ă â î ș ț) —
// без этого списка они ошибочно определялись бы как испанские (см. detectLanguage).
// Список не претендует на полноту, это точечная подстраховка для MVP.
export const COMMON_RO_WORDS_NO_DIACRITICS: ReadonlySet<string> = new Set([
  'eu', 'tu', 'el', 'ea', 'noi', 'voi', 'ei', 'ele',
  'este', 'sunt', 'era', 'fost', 'avea', 'are', 'am', 'ai', 'avem', 'aveti', 'au',
  'si', 'sau', 'dar', 'deci', 'doar', 'mult', 'mai', 'bine', 'bun', 'buna', 'rau',
  'mic', 'mare', 'nou', 'vechi', 'prieten', 'prietena', 'prieteni', 'familie',
  'frate', 'sora', 'mama', 'tata', 'copil', 'copii', 'barbat', 'femeie', 'om', 'oameni',
  'oras', 'tara', 'zi', 'zile', 'noapte', 'an', 'ani', 'timp', 'munca', 'carte', 'carti',
  'apa', 'foc', 'aer', 'pamant', 'soare', 'luna', 'stea', 'stele', 'drum', 'strada',
  'acasa', 'astazi', 'maine', 'ieri', 'acum', 'aici', 'acolo', 'cine', 'unde', 'cand',
  'cum', 'ce', 'care', 'cat', 'multumesc', 'buna', 'salut', 'noapte', 'da', 'nu',
  'unu', 'doi', 'trei', 'patru', 'cinci', 'sase', 'sapte', 'opt', 'noua', 'zece',
  'luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata', 'duminica',
  'iubire', 'iubit', 'iubita', 'suflet', 'inima', 'minte', 'gand', 'vorba', 'cuvant',
  'scoala', 'profesor', 'elev', 'student', 'masa', 'scaun', 'usa', 'fereastra', 'perete',
])
