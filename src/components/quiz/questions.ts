/**
 * Client-safe quiz content — prompts and options only, no `correctIndex`
 * and no `note`. Those stay server-side in src/server/quiz-data.ts (grading
 * happens in the answerQuestion/submitQuiz actions) so the answer key never
 * ships to the browser. Keep this list's ids/prompts/options in sync with
 * that file by hand — there are only 8 questions.
 */

export interface ClientQuestion {
  id: string
  prompt: string
  options: [string, string, string, string]
}

export const QUIZ_TITLE = 'The Forever Dolly Quiz'

export const CLIENT_QUESTIONS: ClientQuestion[] = [
  {
    id: 'q1',
    prompt: 'Where was Dolly Parton born?',
    options: ['Nashville', 'Locust Ridge, Tennessee', 'Asheville', 'Memphis'],
  },
  {
    id: 'q2',
    prompt: 'What childhood gift inspired "Coat of Many Colors"?',
    options: ['A patchwork coat her mother sewed', 'A guitar', 'A hymnal', 'Red shoes'],
  },
  {
    id: 'q3',
    prompt: 'Which Dolly song became a worldwide hit for Whitney Houston?',
    options: ['Jolene', '9 to 5', 'I Will Always Love You', 'Islands in the Stream'],
  },
  {
    id: 'q4',
    prompt: "Name of Dolly's theme park in Pigeon Forge?",
    options: ['Dollyland', 'Smoky Park', 'Butterfly Grove', 'Dollywood'],
  },
  {
    id: 'q5',
    prompt: 'Imagination Library mails children what, every month?',
    options: ['A toy', 'A free book', 'A song', 'A postcard'],
  },
  {
    id: 'q6',
    prompt: 'How many siblings did Dolly grow up with?',
    options: ['3', '5', '11', '14'],
  },
  {
    id: 'q7',
    prompt: '"Jolene" and "I Will Always Love You" were reportedly written…',
    options: ['Decade apart', 'On the same day', 'For the same film', 'One night on tour'],
  },
  {
    id: 'q8',
    prompt: "Dolly's signature creature?",
    options: ['Hummingbird', 'Firefly', 'Butterfly', 'Dove'],
  },
]
