// Dolly Parton trivia question bank.
// Server-only: contains correct answers, so this must never be imported by client code.
// Client-safe prompts/options (no correctIndex, no note) live separately in
// src/components/quiz/questions.ts.

export interface QuizQuestion {
  id: string; // q1..q8
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  /** Shown to the player after they answer, win or lose. */
  note: string;
}

export const QUIZ_TITLE = "The Forever Dolly Quiz";

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Where was Dolly Parton born?",
    options: ["Nashville", "Locust Ridge, Tennessee", "Asheville", "Memphis"],
    correctIndex: 1,
    note: "A one-room cabin in Locust Ridge, in the Smoky Mountains.",
  },
  {
    id: "q2",
    prompt: 'What childhood gift inspired "Coat of Many Colors"?',
    options: [
      "A patchwork coat her mother sewed",
      "A guitar",
      "A hymnal",
      "Red shoes",
    ],
    correctIndex: 0,
    note: "Her mother stitched it from rags — and made it a story of love.",
  },
  {
    id: "q3",
    prompt: "Which Dolly song became a worldwide hit for Whitney Houston?",
    options: ["Jolene", "9 to 5", "I Will Always Love You", "Islands in the Stream"],
    correctIndex: 2,
    note: "Written in 1973 — Whitney's 1992 version topped charts everywhere.",
  },
  {
    id: "q4",
    prompt: "Name of Dolly's theme park in Pigeon Forge?",
    options: ["Dollyland", "Smoky Park", "Butterfly Grove", "Dollywood"],
    correctIndex: 3,
    note: "Opened in 1986, in her beloved East Tennessee.",
  },
  {
    id: "q5",
    prompt: "Imagination Library mails children what, every month?",
    options: ["A toy", "A free book", "A song", "A postcard"],
    correctIndex: 1,
    note: "A free book from birth to age five — over 200 million mailed.",
  },
  {
    id: "q6",
    prompt: "How many siblings did Dolly grow up with?",
    options: ["3", "5", "11", "14"],
    correctIndex: 2,
    note: "She was the fourth of twelve children.",
  },
  {
    id: "q7",
    prompt: '"Jolene" and "I Will Always Love You" were reportedly written…',
    options: [
      "Decade apart",
      "On the same day",
      "For the same film",
      "One night on tour",
    ],
    correctIndex: 1,
    note: "One legendary songwriting session, as Dolly tells it.",
  },
  {
    id: "q8",
    prompt: "Dolly's signature creature?",
    options: ["Hummingbird", "Firefly", "Butterfly", "Dove"],
    correctIndex: 2,
    note: "Butterflies — free, gentle, and never hurting a soul.",
  },
];
