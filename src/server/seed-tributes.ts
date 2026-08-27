/**
 * Curated starter tributes — seeded once by ensureAdmin on the owner's first
 * sign-in after deploy (see `seedWallOnce` in src/actions). Every card is a
 * real, documented moment; bylined "Forever Dolly" as curated content, never
 * invented fans. Facts align with the Ask Dolly fact sheet (src/ai/tools.ts).
 */

export interface SeedTribute {
  body: string
  place?: string
  year?: string
  pinned?: boolean
}

export const SEED_TRIBUTES: SeedTribute[] = [
  {
    body: 'Born fourth of twelve in a one-room cabin on the banks of the Little Pigeon River. The doctor who delivered her was paid with a sack of cornmeal. Every song since started here.',
    place: 'Locust Ridge, Tennessee',
    year: '1946',
    pinned: true,
  },
  {
    body: 'Her mama stitched a little coat from a box of rags, telling the story of Joseph while she sewed. The kids at school laughed. Dolly turned it into the truest song about love and poverty ever written.',
    place: 'Sevierville, Tennessee',
    year: '1971',
  },
  {
    body: 'A flame-haired bank teller kept flirting with her husband Carl, and a young fan named Jolene asked for an autograph the same era. Two strangers, one immortal song — written back to back with I Will Always Love You.',
    place: 'Nashville',
    year: '1973',
  },
  {
    body: 'She wrote I Will Always Love You as a farewell to Porter Wagoner when she left his show to go solo. Eighteen years later Whitney Houston sang it to the whole world. Dolly kept the publishing.',
    place: 'Nashville',
    year: '1974',
  },
  {
    body: 'On the set of 9 to 5 she tapped out the rhythm of the title song on her acrylic nails like a typewriter. It went to number one and got an Oscar nomination.',
    place: 'Hollywood',
    year: '1980',
  },
  {
    body: 'Instead of putting her name on a tower somewhere, she opened Dollywood in the foothills of the Smokies — thousands of jobs for the county she grew up in, and a place her family could be proud of.',
    place: 'Pigeon Forge, Tennessee',
    year: '1986',
  },
  {
    body: "Her daddy never learned to read or write. So she started mailing free books to children — the Imagination Library has now given away more than 240 million of them, one child at a time.",
    place: 'Sevier County, Tennessee',
    year: '1995',
  },
  {
    body: 'She played the Glastonbury legends slot in rhinestones and drew one of the biggest crowds the festival had ever seen. A hundred thousand people singing Jolene in a field in Somerset.',
    place: 'Glastonbury, England',
    year: '2014',
  },
  {
    body: 'When wildfires tore through Gatlinburg, her My People Fund quietly sent $1,000 a month to every family who lost their home, for six months. No cameras, just checks.',
    place: 'Gatlinburg, Tennessee',
    year: '2016',
  },
  {
    body: "Her $1 million gift to Vanderbilt helped fund the research behind Moderna's COVID vaccine. When she got her own shot, she sang 'vaccine, vaccine' to the tune of Jolene.",
    place: 'Nashville',
    year: '2020',
  },
]
