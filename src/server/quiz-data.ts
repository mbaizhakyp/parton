// Dolly Parton trivia question bank.
// Server-only: contains correct answers, so this must never be imported by client code.

export interface QuizQuestion {
  id: string; // q1..q10
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export const QUIZ_TITLE = "How Well Do You Know Dolly?";

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Dolly Parton grew up in the foothills of which state?",
    options: ["Tennessee", "Kentucky", "West Virginia", "North Carolina"],
    correctIndex: 0,
  },
  {
    id: "q2",
    prompt: "Which theme park did Dolly help transform into 'Dollywood'?",
    options: [
      "Silver Dollar City in Pigeon Forge",
      "Opryland USA in Nashville",
      "Six Flags Over Georgia",
      "Cedar Point in Ohio",
    ],
    correctIndex: 0,
  },
  {
    id: "q3",
    prompt: "What is the name of Dolly's charity that mails free books to children each month?",
    options: [
      "Reading Rainbow Fund",
      "Dolly's Imagination Library",
      "Books for Tennessee Kids",
      "The Storytime Foundation",
    ],
    correctIndex: 1,
  },
  {
    id: "q4",
    prompt: "\"Jolene\" is famously a song about Dolly asking another woman not to do what?",
    options: [
      "Move away from her hometown",
      "Take her man",
      "Reveal a secret",
      "Copy her singing style",
    ],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt: "Dolly wrote \"I Will Always Love You\" as a farewell message to which figure in her career?",
    options: [
      "Her record producer",
      "Her songwriting partner",
      "Her business mentor and TV co-host, Porter Wagoner",
      "Her high school music teacher",
    ],
    correctIndex: 2,
  },
  {
    id: "q6",
    prompt: "Which 1980 movie, also the title of one of her biggest hits, starred Dolly alongside Jane Fonda and Lily Tomlin?",
    options: ["Steel Magnolias", "9 to 5", "Straight Talk", "Rhinestone"],
    correctIndex: 1,
  },
  {
    id: "q7",
    prompt: "Which massive pop star had a huge hit in 1992 by covering \"I Will Always Love You\"?",
    options: ["Celine Dion", "Mariah Carey", "Whitney Houston", "Reba McEntire"],
    correctIndex: 2,
  },
  {
    id: "q8",
    prompt: "Dolly first rose to national attention performing on TV alongside which country star before going solo?",
    options: ["Porter Wagoner", "Johnny Cash", "Chet Atkins", "Roy Acuff"],
    correctIndex: 0,
  },
  {
    id: "q9",
    prompt: "Dollywood, the theme park in Pigeon Forge, is co-owned by Dolly alongside which company?",
    options: [
      "Herschend Family Entertainment",
      "The Walt Disney Company",
      "Cedar Fair Entertainment",
      "Live Nation",
    ],
    correctIndex: 0,
  },
  {
    id: "q10",
    prompt: "Dolly's million-dollar donation toward COVID-19 vaccine research went to fund work at which institution?",
    options: [
      "Johns Hopkins University",
      "Vanderbilt University Medical Center",
      "The Mayo Clinic",
      "The CDC Foundation",
    ],
    correctIndex: 1,
  },
];
