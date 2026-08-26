/** Result-screen and share-card copy formulas — shared so both surfaces agree. */

export function rankLine(score: number, total: number): string {
  if (score === total) return 'A perfect score — pure rhinestone!'
  if (score >= 6) return `You out-sparkled ${60 + score * 4}% of fans`
  if (score >= 3) return `You out-sparkled ${30 + score * 5}% of fans`
  return 'Every fan starts somewhere ✦'
}

export function rankQuip(score: number, total: number): string {
  if (score === total) return "Dolly would be proud. We're a little proud too."
  if (score >= 6) return 'Certified Smoky Mountain scholar.'
  if (score >= 3) return 'A respectable showing — spin the records and try again.'
  return 'The best excuse to listen to more Dolly.'
}
