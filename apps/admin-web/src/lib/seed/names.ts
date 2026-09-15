import type { Rng } from './rng';

/**
 * Name pools for the seed.
 *
 * Realistic Bihari and north-Indian names in Latin script. The interface is
 * English throughout, so there is no Devanagari here — but the names are real
 * names rather than placeholder strings, because a directory of 140 workers
 * called "Worker 47" undermines every claim the demo makes about the people the
 * platform serves.
 */

const GIVEN_NAMES = [
  'Aarti',
  'Abhishek',
  'Aditya',
  'Ajay',
  'Akhilesh',
  'Alok',
  'Amar',
  'Amrita',
  'Anand',
  'Anita',
  'Anjali',
  'Ankit',
  'Archana',
  'Arjun',
  'Aruna',
  'Ashok',
  'Asha',
  'Babita',
  'Bhavesh',
  'Bimal',
  'Chandan',
  'Chhavi',
  'Deepak',
  'Deepti',
  'Dhiraj',
  'Divya',
  'Gaurav',
  'Geeta',
  'Girish',
  'Gopal',
  'Harish',
  'Hemant',
  'Indu',
  'Jatin',
  'Jyoti',
  'Kajal',
  'Kamal',
  'Kavita',
  'Kiran',
  'Kishore',
  'Krishna',
  'Kumud',
  'Lalita',
  'Madhav',
  'Mahesh',
  'Mamta',
  'Manish',
  'Manoj',
  'Meena',
  'Mithilesh',
  'Mukesh',
  'Nalini',
  'Nandini',
  'Naveen',
  'Neelam',
  'Neha',
  'Nikhil',
  'Nisha',
  'Om',
  'Pankaj',
  'Parvati',
  'Pawan',
  'Poonam',
  'Pooja',
  'Prabhat',
  'Pradeep',
  'Pramod',
  'Prashant',
  'Preeti',
  'Priya',
  'Pushpa',
  'Radha',
  'Rahul',
  'Raj',
  'Rajeev',
  'Rajesh',
  'Rakesh',
  'Ramesh',
  'Rani',
  'Ravi',
  'Rekha',
  'Renu',
  'Ritu',
  'Rohit',
  'Ruchi',
  'Sachin',
  'Sadhana',
  'Sandeep',
  'Sanjay',
  'Santosh',
  'Sarita',
  'Satish',
  'Savita',
  'Seema',
  'Shailesh',
  'Shalini',
  'Shanti',
  'Shashi',
  'Shilpa',
  'Shiv',
  'Shobha',
  'Shweta',
  'Sitaram',
  'Sneha',
  'Sonu',
  'Subhash',
  'Sudha',
  'Sunil',
  'Sunita',
  'Suresh',
  'Sushma',
  'Swati',
  'Tarun',
  'Uma',
  'Usha',
  'Vandana',
  'Varun',
  'Vijay',
  'Vikas',
  'Vimal',
  'Vinay',
  'Vinod',
  'Vishal',
  'Yogesh',
] as const;

const SURNAMES = [
  'Choudhary',
  'Das',
  'Devi',
  'Gupta',
  'Jha',
  'Kumar',
  'Kumari',
  'Mahto',
  'Mandal',
  'Mishra',
  'Paswan',
  'Pandey',
  'Prasad',
  'Rai',
  'Raut',
  'Ram',
  'Ranjan',
  'Roy',
  'Sah',
  'Sahni',
  'Saxena',
  'Sharma',
  'Singh',
  'Sinha',
  'Thakur',
  'Tiwari',
  'Verma',
  'Yadav',
] as const;

/**
 * Draws a full name that has not been used before in this run.
 *
 * Uniqueness matters because names are how an operator identifies a worker on
 * screen — two "Ravi Kumar"s in a 140-row directory is a usability bug in the
 * seed, not realistic texture. The pools give over 3,500 combinations for 140
 * workers, so the retry loop effectively never runs long.
 */
export function createNameFactory(rng: Rng): () => string {
  const used = new Set<string>();

  return function nextName(): string {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const name = `${rng.pick(GIVEN_NAMES)} ${rng.pick(SURNAMES)}`;
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }
    throw new Error('Exhausted the name pool; widen GIVEN_NAMES or SURNAMES');
  };
}

/**
 * An Indian mobile number in the display format the product uses throughout.
 *
 * Drawn from the 7/8/9 prefixes that real Indian mobile numbers use. These are
 * seed values for a prototype and are not expected to reach a real handset.
 */
export function phoneNumber(rng: Rng): string {
  const first = rng.pick([7, 8, 9] as const);
  let rest = '';
  for (let i = 0; i < 9; i += 1) rest += rng.int(0, 9);
  const digits = `${first}${rest}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * A deterministic placeholder avatar.
 *
 * pravatar serves a stable image per `img` index, so the same worker keeps the
 * same face across reloads. Every avatar in the product falls back to initials in
 * a marigold-tint circle if the request fails — see the Avatar primitive. A
 * broken image on a projector is not an acceptable failure mode.
 */
export function avatarUrl(index: number): string {
  return `https://i.pravatar.cc/160?img=${(index % 70) + 1}`;
}
