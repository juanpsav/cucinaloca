import type { Change } from "@/lib/recipe/edit";

/** What code can verify on the final recipe and reply. The judges cover the rest (see `expect`). */
export type Checks = {
  /** Nothing in the final recipe (ingredients or steps) matches any of these. */
  absent?: RegExp[];
  /** Some ingredient line matches each of these. */
  present?: RegExp[];
  /** The recipe and its scale are exactly as they were (questions, advice). */
  unchanged?: boolean;
  /** The recipe was edited. */
  edited?: boolean;
  /** Final scale relative to the original. */
  factor?: number;
  /** true: a lasting preference must be saved. false: none may be (one-off situations). */
  remembers?: boolean;
  /** Reply language, when the cook doesn't write in English. */
  language?: "fr";
  /** Longest acceptable reply. Default 70 words after a change, 130 for questions. */
  maxWords?: number;
};

export type Case = {
  id: string;
  /** tags[0] groups the report. */
  tags: string[];
  recipe: string;
  message: string;
  factor?: number;
  preferences?: string[];
  /** Earlier turns, with `setup` holding the edits they made (applied before the case runs). */
  history?: { role: "user" | "assistant"; text: string; changes: string[] }[];
  setup?: Change[];
  context?: { date: string; region: string };
  checks: Checks;
  /** For the judges: what a great answer does here. */
  expect: string;
};

const noDairyButter = /(?<!(dairy[- ]free|vegan|plant[- ]based) )butter\b/i;

export const CASES: Case[] = [
  // Swaps and missing ingredients
  {
    id: "bolognese-no-pancetta-dutch-oven",
    tags: ["swap", "equipment"],
    recipe: "bolognese",
    message: "I don't have pancetta, and I'm using a Dutch oven instead of a saucepan.",
    checks: { absent: [/pancetta/i, /saucepan/i], edited: true, remembers: false },
    expect: "Removes the pancetta everywhere (or replaces it sensibly, e.g. smoked bacon or mushrooms), keeps enough fat to fry the veg, and moves the method to the Dutch oven. The reply mentions only what the cook wouldn't notice: less smoky/salty flavour, taste for salt.",
  },
  {
    id: "bolognese-no-wine-kids",
    tags: ["swap"],
    recipe: "bolognese",
    message: "Can I skip the wine? It's for the kids.",
    checks: { absent: [/red wine(?! vinegar)/i], edited: true },
    expect: "Removes the wine and replaces the liquid (more stock, or stock plus a splash of vinegar or balsamic for acidity). Step 4 no longer mentions wine.",
  },
  {
    id: "cookies-out-of-eggs",
    tags: ["swap", "baking"],
    recipe: "cookies",
    message: "I'm out of eggs.",
    checks: { absent: [/large eggs?/i, /the eggs\b/i], edited: true, remembers: false },
    expect: "Replaces the 2 eggs with a workable substitute and amount for cookies (e.g. 3-4 tbsp yogurt, milk, or 2 flax eggs) and updates step 2. Mentions the texture difference (flatter or less chewy). Does not save a preference: being out of eggs is a one-off.",
  },
  {
    id: "cookies-only-salted-butter",
    tags: ["swap", "baking"],
    recipe: "cookies",
    message: "I only have salted butter.",
    checks: { present: [/salted butter/i], absent: [/unsalted/i], edited: true },
    expect: "Uses salted butter and reduces or removes the added salt (about 225 g salted butter carries roughly ½ tsp salt already).",
  },
  {
    id: "cookies-no-brown-sugar",
    tags: ["swap", "baking"],
    recipe: "cookies",
    message: "No brown sugar, just white.",
    checks: { absent: [/brown sugar/i], edited: true },
    expect: "Uses all white sugar (same total, 250 g) or suggests white sugar plus a little treacle/molasses. Mentions cookies will be crisper and paler.",
  },
  {
    id: "chicken-no-lemon",
    tags: ["swap"],
    recipe: "chicken",
    message: "No lemon.",
    checks: { absent: [/lemon/i], edited: true },
    expect: "Removes the lemon from the ingredients and step 3; may suggest an optional alternative (orange, a splash of vinegar at the end, or just more herbs/garlic).",
  },
  {
    id: "chicken-thighs-instead",
    tags: ["swap"],
    recipe: "chicken",
    message: "Can I use chicken thighs instead of a whole chicken?",
    checks: { absent: [/whole chicken/i], present: [/thigh/i], edited: true },
    expect: "Switches to bone-in thighs (about 8 for 4 people), puts the lemon/garlic/thyme around them instead of inside, and shortens roasting to roughly 35-45 minutes with a matching timer. Resting can be shorter.",
  },
  {
    id: "pancakes-no-buttermilk",
    tags: ["swap"],
    recipe: "pancakes",
    message: "No buttermilk.",
    checks: { absent: [/buttermilk/i], edited: true },
    expect: "Replaces buttermilk with milk soured with lemon juice or vinegar (about 1 tbsp per 300 ml, left 5 minutes), or milk plus yogurt. Updates step 2.",
  },
  {
    id: "soupe-sans-vin",
    tags: ["swap", "french"],
    recipe: "soupe",
    message: "Je n'ai pas de vin blanc.",
    checks: { absent: [/^(?!.*vinaigre).*\bvin blanc\b/i], edited: true, language: "fr" },
    expect: "Replies in French. Removes the white wine (deglaze with a little more stock, perhaps a splash of cider vinegar or a dash of cognac if they have it) and updates step 2.",
  },

  // Diets and allergies
  {
    id: "bolognese-vegetarian",
    tags: ["diet"],
    recipe: "bolognese",
    message: "We're vegetarian.",
    checks: { absent: [/pancetta/i, /beef/i], edited: true, remembers: true },
    expect: "Replaces pancetta, beef mince and beef stock (e.g. mushrooms, lentils or plant-based mince, vegetable stock), adjusts browning and simmering where needed. Saves the lasting preference. May note parmesan uses animal rennet.",
  },
  {
    id: "bolognese-gluten-free",
    tags: ["diet"],
    recipe: "bolognese",
    message: "Make it gluten-free.",
    checks: { present: [/gluten[- ]free/i], edited: true },
    expect: "Switches to gluten-free pasta and a gluten-free stock (many stock cubes contain wheat). Nothing else needs to change.",
  },
  {
    id: "cookies-coeliac-friend",
    tags: ["diet", "baking"],
    recipe: "cookies",
    message: "My friend has coeliac disease, can we make these for her?",
    checks: { present: [/gluten[- ]free/i], absent: [/(?<!gluten[- ]free )\bplain flour\b/i], edited: true },
    expect: "Uses a gluten-free flour blend (mentions xanthan gum if the blend lacks it) and flags hidden gluten or cross-contamination (check the chocolate label, clean surfaces). The friend's condition is not the cook's lasting preference.",
  },
  {
    id: "curry-vegan",
    tags: ["diet"],
    recipe: "curry",
    message: "Make it vegan.",
    checks: { absent: [/chicken/i, /(?<!vegan )fish sauce/i], edited: true },
    expect: "Replaces chicken (tofu, vegetables or chickpeas), chicken stock (vegetable stock) and fish sauce (soy sauce or vegan fish sauce). Flags that many green curry pastes contain shrimp paste, so use a vegan paste or check the label.",
  },
  {
    id: "curry-shellfish-allergy",
    tags: ["allergy"],
    recipe: "curry",
    message: "My partner is allergic to shellfish.",
    checks: { remembers: true },
    expect: "Recognises the hidden risk: most green curry pastes contain shrimp paste. Either changes to a shellfish-free paste or tells the cook to check the label, and notes fish sauce is fish, not shellfish (fine unless cross-contact is a worry). Saves the allergy as a lasting preference.",
  },
  {
    id: "curry-coconut-allergy",
    tags: ["allergy"],
    recipe: "curry",
    message: "I'm allergic to coconut.",
    checks: { absent: [/coconut/i], edited: true, remembers: true },
    expect: "Replaces the coconut milk with a creamy non-coconut option (e.g. evaporated milk, cashew cream or oat cream plus a little stock) and updates step 3. Saves the allergy.",
  },
  {
    id: "pancakes-dairy-free-household",
    tags: ["diet"],
    recipe: "pancakes",
    message: "We always cook dairy-free.",
    checks: { absent: [/buttermilk/i, noDairyButter], edited: true, remembers: true },
    expect: "Replaces buttermilk (plant milk with lemon juice or vinegar) and butter (oil or dairy-free butter) everywhere, including greasing the pan. Saves the lasting preference.",
  },
  {
    id: "soupe-ami-vegetarien",
    tags: ["diet", "french"],
    recipe: "soupe",
    message: "C'est pour un ami végétarien.",
    checks: { absent: [/bœuf|boeuf/i], edited: true, language: "fr" },
    expect: "Replies in French. Replaces the beef stock with a rich vegetable stock (maybe with a little soy sauce or miso for depth). Might note that comté is traditionally made with animal rennet. The friend isn't the cook, so no preference is saved.",
  },
  {
    id: "curry-mild-for-kids",
    tags: ["diet"],
    recipe: "curry",
    message: "My kids can't handle heat.",
    checks: { edited: true },
    expect: "Reduces the curry paste (e.g. to 1-1½ tbsp) and balances with a little more coconut milk or sugar; may suggest adding more paste to adult portions at the end.",
  },

  // Scaling
  {
    id: "bolognese-for-two",
    tags: ["scale"],
    recipe: "bolognese",
    message: "Make it for 2.",
    checks: { factor: 0.5, edited: false },
    expect: "Rescales to 2 servings without rewriting ingredient text. The reply is a few words, or notes something useful (e.g. a smaller pan, the sauce reduces faster).",
  },
  {
    id: "cookies-dozen",
    tags: ["scale", "baking"],
    recipe: "cookies",
    message: "I only want 12 cookies.",
    checks: { factor: 0.5, edited: false },
    expect: "Rescales to 12 cookies. At half the recipe, 1 egg works fine.",
  },
  {
    id: "curry-six-people",
    tags: ["scale"],
    recipe: "curry",
    message: "We're 6 now.",
    checks: { factor: 1.5, edited: false },
    expect: "Rescales to 6 servings. May mention using a bigger wok or cooking the chicken in two batches so it seals rather than stews.",
  },
  {
    id: "pancakes-twenty",
    tags: ["scale"],
    recipe: "pancakes",
    message: "Make 20 pancakes.",
    checks: { factor: 2.5, edited: false },
    expect: "Rescales to 20 pancakes. May mention keeping cooked ones warm in a low oven.",
  },

  // Equipment
  {
    id: "chicken-air-fryer-only",
    tags: ["equipment"],
    recipe: "chicken",
    message: "I don't have an oven, only an air fryer.",
    checks: { absent: [/\boven\b/i, /roasting tin/i], present: [], edited: true },
    expect: "Adapts to an air fryer realistically: spatchcock or joint the chicken (or use pieces) so it fits, around 180-190°C, cook the potatoes separately or in batches, and use an internal temperature of 75°C / juices running clear as the doneness cue. Timers updated.",
  },
  {
    id: "cookies-no-mixer",
    tags: ["equipment", "baking"],
    recipe: "cookies",
    message: "I don't have an electric mixer.",
    checks: {},
    expect: "Explains or edits step 2 for mixing by hand: very soft (or melted and cooled) butter, a wooden spoon, beat longer. Either a short answer or an edit is fine.",
  },
  {
    id: "curry-no-wok",
    tags: ["equipment"],
    recipe: "curry",
    message: "Can I use a normal frying pan?",
    checks: {},
    expect: "Yes, a large deep frying pan or sauté pan works; don't crowd the chicken. A short answer or a small edit to steps 1-2 are both fine.",
  },

  // Questions that must not change the recipe
  {
    id: "bolognese-day-before",
    tags: ["question"],
    recipe: "bolognese",
    message: "Can I make the sauce the day before?",
    checks: { unchanged: true },
    expect: "Yes: make the sauce through step 5, cool, refrigerate (2-3 days), reheat gently until piping hot, cook the pasta fresh.",
  },
  {
    id: "bolognese-watery-sauce",
    tags: ["question"],
    recipe: "bolognese",
    message: "It's been an hour and the sauce still looks watery.",
    checks: { unchanged: true },
    expect: "Take the lid off and simmer 10-20 minutes more, stirring, until it thickens. Short and specific.",
  },
  {
    id: "bolognese-oven-irrelevant",
    tags: ["question"],
    recipe: "bolognese",
    message: "My oven only goes to 400F, is that ok?",
    checks: { unchanged: true, maxWords: 50 },
    expect: "Points out the recipe doesn't use the oven at all. One or two sentences.",
  },
  {
    id: "chicken-dinner-timing",
    tags: ["question"],
    recipe: "chicken",
    message: "Guests arrive at 7 and I want to eat at 7:30. When should I start?",
    checks: { unchanged: true },
    expect: "Works backwards: 15 min rest, 1 h 20 roast, ~15 min prep and oven heating, so start around 5:15-5:20 (earlier is fine; chicken holds warm).",
  },
  {
    id: "chicken-doneness-no-thermometer",
    tags: ["question"],
    recipe: "chicken",
    message: "How do I know it's cooked without a thermometer?",
    checks: { unchanged: true },
    expect: "Pierce the thickest part of the thigh: juices run clear, not pink; the leg wiggles loosely; meat near the bone isn't pink. Concise.",
  },
  {
    id: "cookies-why-rest-on-tray",
    tags: ["question", "baking"],
    recipe: "cookies",
    message: "Why do I leave them on the tray for 5 minutes?",
    checks: { unchanged: true, maxWords: 70 },
    expect: "They're very soft straight out of the oven and set as they cool, so moving them early breaks them.",
  },
  {
    id: "soupe-la-veille",
    tags: ["question", "french"],
    recipe: "soupe",
    message: "Je peux la préparer la veille ?",
    checks: { unchanged: true, language: "fr" },
    expect: "Replies in French: yes, make the soup through step 3, refrigerate, reheat, then do the bread and cheese and grill just before serving.",
  },

  // Seasonal (the date and time zone come from the cook's browser)
  {
    id: "bolognese-in-season-north",
    tags: ["seasonal"],
    recipe: "bolognese",
    message: "What could I add that's in season right now?",
    context: { date: "Friday 16 October 2026", region: "Europe/London" },
    checks: {},
    expect: "Mid-October in the UK is autumn: suggests things like mushrooms, squash, kale/cavolo nero or chestnuts, and says how to add them. Nothing out of season (no summer tomatoes or asparagus). Editing the recipe is optional.",
  },
  {
    id: "bolognese-in-season-south",
    tags: ["seasonal"],
    recipe: "bolognese",
    message: "What could I add that's in season right now?",
    context: { date: "Friday 16 October 2026", region: "Australia/Sydney" },
    checks: {},
    expect: "Mid-October in Sydney is spring: suggests spring produce (e.g. asparagus, peas, broad beans, spring greens, zucchini starting), not autumn produce. Editing the recipe is optional.",
  },

  // Follow-ups that depend on the conversation so far
  {
    id: "bolognese-put-pancetta-back",
    tags: ["follow-up"],
    recipe: "bolognese",
    history: [
      { role: "user", text: "I don't have pancetta.", changes: [] },
      { role: "assistant", text: "It'll be a little less rich, so taste for salt at the end.", changes: ["Mushrooms instead of pancetta"] },
    ],
    setup: [
      {
        summary: "Mushrooms instead of pancetta",
        ops: [
          { op: "update_ingredient", id: "i2", template: "[[200]] g mushrooms, finely chopped", name: "mushrooms", ingredientIds: null, timers: null },
          { op: "update_step", id: "s1", template: "Heat the oil in a large saucepan over a medium heat and fry the mushrooms for 8 minutes until golden.", name: null, ingredientIds: null, timers: [{ label: "Fry mushrooms", seconds: 480 }] },
        ],
      },
    ],
    message: "Actually I found some pancetta in the fridge, put it back.",
    checks: { present: [/pancetta/i], edited: true },
    expect: "Restores the pancetta (100 g, fried until crisp) in the ingredients and step 1. Keeping the mushrooms as well is acceptable only if it says so.",
  },
  {
    id: "bolognese-scaled-spaghetti-amount",
    tags: ["follow-up", "question"],
    recipe: "bolognese",
    factor: 0.5,
    history: [
      { role: "user", text: "Make it for 2.", changes: [] },
      { role: "assistant", text: "Done.", changes: ["Scaled to 2 servings"] },
    ],
    message: "How much spaghetti is that?",
    checks: { unchanged: true, factor: 0.5, maxWords: 40 },
    expect: "200 g (the recipe is at half scale). One short sentence.",
  },
];
