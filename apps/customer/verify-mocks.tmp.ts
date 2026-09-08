import { categoryMatchesQuery, findCategoryById, serviceCategories } from './src/mocks';

const carpenters = findCategoryById('cat_carpenters')!;
const cleaners = findCategoryById('cat_cleaners')!;

const codes = (s: string) => [...s].map((c) => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');

// The stored label, and the two ways a keyboard can encode "badh" with a nukta.
console.log('stored  बढ़ई   :', codes(carpenters.nameLocalized!.hi));
const precomposed = '\u092C\u095D';            // ब + ढ़ (single code point)
const decomposed = '\u092C\u0922\u093C';       // ब + ढ + nukta
console.log('query precomposed:', codes(precomposed));
console.log('query decomposed :', codes(decomposed));
console.log('raw string equal :', precomposed === decomposed);
console.log();

const cases: [string, string, boolean][] = [
  ['बढ़ precomposed', precomposed, true],
  ['बढ़ decomposed', decomposed, true],
  ['carp (Latin, hi record)', 'carp', true],
  ['CARP (uppercase)', 'CARP', true],
  ['  carp  (padded)', '  carp  ', true],
  ['सफ़ाई (Cleaners)', 'सफ़ाई', false],
  ['plumb (wrong category)', 'plumb', false],
];

let failed = 0;
for (const [label, query, shouldMatch] of cases) {
  const got = categoryMatchesQuery(carpenters, query);
  const ok = got === shouldMatch;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Carpenters vs "${label}" -> ${got} (expected ${shouldMatch})`);
}

console.log();
console.log('सफ़ाई finds Cleaners :', categoryMatchesQuery(cleaners, 'सफ़ाई'));
console.log('empty query matches all:', serviceCategories.filter((c) => categoryMatchesQuery(c, '')).length + '/' + serviceCategories.length);
console.log('"er" matches           :', serviceCategories.filter((c) => categoryMatchesQuery(c, 'er')).map((c) => c.name).join(', '));
console.log();
console.log(failed === 0 ? 'ALL SEARCH CASES PASS' : `${failed} SEARCH CASES FAILED`);
