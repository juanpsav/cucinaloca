// Six recipes written for this eval (not copied from any publisher), in the enriched
// shape the app works with: templates mark what scales, steps link their ingredients.
import { MARKER, renderText } from "@/lib/recipe/scale";
import type { Ingredient, Recipe, Step, Timer } from "@/lib/recipe/types";

const scalable = (t: string) => new RegExp(MARKER.source).test(t);

function ing(id: string, template: string, name: string, group: string | null = null): Ingredient {
  return { id, text: renderText(template, 1), template: scalable(template) ? template : null, group, name };
}

function step(id: string, template: string, ingredientIds: string[], timers: Timer[] = []): Step {
  return { id, text: renderText(template, 1), template: scalable(template) ? template : null, group: null, ingredientIds, timers };
}

function recipe(r: Omit<Recipe, "meta" | "enriched" | "description"> & { description?: string }): Recipe {
  return { description: null, ...r, meta: { url: null, siteName: "Eval kitchen", author: null, image: null }, enriched: true };
}

export const RECIPES: Record<string, Recipe> = {
  bolognese: recipe({
    title: "Weeknight bolognese",
    times: { prep: 15, cook: 90, total: 105 },
    servings: { amount: 4, label: "servings", text: "Serves 4" },
    ingredients: [
      ing("i1", "[[2]] tbsp olive oil", "olive oil"),
      ing("i2", "[[100]] g pancetta, diced", "pancetta"),
      ing("i3", "[[1|w]] onion, finely chopped", "onion"),
      ing("i4", "[[1|w]] carrot, finely chopped", "carrot"),
      ing("i5", "[[1|w]] celery stick, finely chopped", "celery"),
      ing("i6", "[[2|w]] garlic cloves, crushed", "garlic"),
      ing("i7", "[[500]] g beef mince", "beef mince"),
      ing("i8", "[[150]] ml red wine", "red wine"),
      ing("i9", "[[1|w]] × 400 g tin chopped tomatoes", "chopped tomatoes"),
      ing("i10", "[[2]] tbsp tomato purée", "tomato purée"),
      ing("i11", "[[250]] ml beef stock", "beef stock"),
      ing("i12", "[[400]] g spaghetti", "spaghetti"),
      ing("i13", "[[50]] g parmesan, grated, to serve", "parmesan"),
    ],
    steps: [
      step("s1", "Heat the oil in a large saucepan over a medium heat and fry the pancetta for 5 minutes until crisp.", ["i1", "i2"], [{ label: "Fry pancetta", seconds: 300 }]),
      step("s2", "Add the onion, carrot and celery and cook for 10 minutes until soft. Stir in the garlic for 1 minute.", ["i3", "i4", "i5", "i6"], [{ label: "Soften veg", seconds: 600 }]),
      step("s3", "Turn up the heat, add the mince and brown it for 5 minutes, breaking it up with a spoon.", ["i7"], [{ label: "Brown mince", seconds: 300 }]),
      step("s4", "Pour in the wine and let it bubble for 2 minutes, then add the tomatoes, tomato purée and stock.", ["i8", "i9", "i10", "i11"]),
      step("s5", "Cover and simmer gently for 1 hour, stirring now and then.", [], [{ label: "Simmer sauce", seconds: 3600 }]),
      step("s6", "Cook the spaghetti in salted boiling water following the pack instructions, then drain and toss with the sauce. Serve with the parmesan.", ["i12", "i13"]),
    ],
  }),

  cookies: recipe({
    title: "Chocolate chunk cookies",
    times: { prep: 15, cook: 12, total: 35 },
    servings: { amount: 24, label: "cookies", text: "Makes 24" },
    ingredients: [
      ing("i1", "[[225]] g unsalted butter, softened", "butter"),
      ing("i2", "[[150]] g light brown sugar", "brown sugar"),
      ing("i3", "[[100]] g granulated sugar", "granulated sugar"),
      ing("i4", "[[2|w]] large eggs", "eggs"),
      ing("i5", "[[1]] tsp vanilla extract", "vanilla"),
      ing("i6", "[[300]] g plain flour", "plain flour"),
      ing("i7", "[[1]] tsp bicarbonate of soda", "bicarbonate of soda"),
      ing("i8", "[[0.5]] tsp salt", "salt"),
      ing("i9", "[[250]] g dark chocolate, chopped", "dark chocolate"),
    ],
    steps: [
      step("s1", "Heat the oven to 180°C (160°C fan) and line two baking trays with baking paper.", []),
      step("s2", "Beat the butter and both sugars together for 3 minutes until pale and fluffy, then beat in the eggs one at a time and the vanilla.", ["i1", "i2", "i3", "i4", "i5"], [{ label: "Cream butter", seconds: 180 }]),
      step("s3", "Mix the flour, bicarbonate of soda and salt, then fold into the butter mixture with the chocolate.", ["i6", "i7", "i8", "i9"]),
      step("s4", "Roll into [[24|w]] balls, space them well apart on the trays and bake for 10–12 minutes until golden at the edges but still soft in the middle.", [], [{ label: "Bake", seconds: 600 }]),
      step("s5", "Leave on the trays for 5 minutes to firm up, then move to a rack to cool.", [], [{ label: "Firm up", seconds: 300 }]),
    ],
  }),

  chicken: recipe({
    title: "Lemon roast chicken with potatoes",
    times: { prep: 15, cook: 80, total: 110 },
    servings: { amount: 4, label: "servings", text: "Serves 4" },
    ingredients: [
      ing("i1", "[[1|w]] whole chicken, about 1.6 kg", "whole chicken"),
      ing("i2", "[[1]] kg potatoes, cut into chunks", "potatoes"),
      ing("i3", "[[1|w]] lemon, halved", "lemon"),
      ing("i4", "[[4|w]] garlic cloves, unpeeled", "garlic"),
      ing("i5", "[[3]] tbsp olive oil", "olive oil"),
      ing("i6", "Small bunch of thyme", "thyme"),
      ing("i7", "Salt and pepper", "salt and pepper"),
    ],
    steps: [
      step("s1", "Heat the oven to 200°C (180°C fan).", []),
      step("s2", "Toss the potatoes with [[2]] tbsp of the oil, salt and pepper in a large roasting tin.", ["i2", "i5", "i7"]),
      step("s3", "Put the lemon halves, garlic and thyme inside the chicken, rub it with the rest of the oil and season well. Sit it on top of the potatoes.", ["i1", "i3", "i4", "i5", "i6"]),
      step("s4", "Roast for 1 hour 20 minutes, until the juices run clear when you pierce the thickest part of the thigh.", [], [{ label: "Roast chicken", seconds: 4800 }]),
      step("s5", "Rest the chicken for 15 minutes before carving. Give the potatoes a shake and put them back in the oven while it rests.", [], [{ label: "Rest chicken", seconds: 900 }]),
    ],
  }),

  curry: recipe({
    title: "Thai green chicken curry",
    times: { prep: 10, cook: 25, total: 35 },
    servings: { amount: 4, label: "servings", text: "Serves 4" },
    ingredients: [
      ing("i1", "[[1]] tbsp vegetable oil", "vegetable oil"),
      ing("i2", "[[3]] tbsp green curry paste", "green curry paste"),
      ing("i3", "[[600]] g chicken thighs, sliced", "chicken thighs"),
      ing("i4", "[[400]] ml coconut milk", "coconut milk"),
      ing("i5", "[[200]] ml chicken stock", "chicken stock"),
      ing("i6", "[[2]] tbsp fish sauce", "fish sauce"),
      ing("i7", "[[1]] tsp brown sugar", "brown sugar"),
      ing("i8", "[[150]] g green beans, trimmed", "green beans"),
      ing("i9", "[[1|w]] lime, juiced", "lime"),
      ing("i10", "Handful of Thai basil", "Thai basil"),
      ing("i11", "Jasmine rice, to serve", "jasmine rice"),
    ],
    steps: [
      step("s1", "Heat the oil in a wok over a medium-high heat and fry the curry paste for 1 minute until fragrant.", ["i1", "i2"], [{ label: "Fry paste", seconds: 60 }]),
      step("s2", "Add the chicken and stir-fry for 5 minutes until sealed.", ["i3"], [{ label: "Seal chicken", seconds: 300 }]),
      step("s3", "Pour in the coconut milk and stock, add the fish sauce and sugar, and simmer for 10 minutes.", ["i4", "i5", "i6", "i7"], [{ label: "Simmer curry", seconds: 600 }]),
      step("s4", "Add the green beans and simmer for another 4 minutes until just tender.", ["i8"], [{ label: "Cook beans", seconds: 240 }]),
      step("s5", "Take off the heat, stir in the lime juice and basil, and serve with rice.", ["i9", "i10", "i11"]),
    ],
  }),

  soupe: recipe({
    title: "Soupe à l'oignon gratinée",
    times: { prep: 15, cook: 70, total: 85 },
    servings: { amount: 4, label: "bols", text: "Pour 4 personnes" },
    ingredients: [
      ing("i1", "[[50]] g de beurre", "beurre"),
      ing("i2", "[[1]] kg d'oignons jaunes, émincés", "oignons"),
      ing("i3", "[[1]] c. à soupe de farine", "farine"),
      ing("i4", "[[15]] cl de vin blanc sec", "vin blanc"),
      ing("i5", "[[1]] l de bouillon de bœuf", "bouillon de bœuf"),
      ing("i6", "[[8|w]] tranches de baguette", "baguette"),
      ing("i7", "[[150]] g de comté râpé", "comté"),
    ],
    steps: [
      step("s1", "Faites fondre le beurre dans une grande cocotte et faites cuire les oignons à feu doux pendant 40 minutes, en remuant souvent, jusqu'à ce qu'ils soient bien dorés.", ["i1", "i2"], [{ label: "Caraméliser les oignons", seconds: 2400 }]),
      step("s2", "Saupoudrez de farine et remuez 1 minute, puis versez le vin et laissez réduire 2 minutes.", ["i3", "i4"]),
      step("s3", "Ajoutez le bouillon et laissez mijoter 20 minutes. Salez et poivrez.", ["i5"], [{ label: "Mijoter", seconds: 1200 }]),
      step("s4", "Répartissez la soupe dans des bols allant au four, posez les tranches de pain dessus et couvrez de comté.", ["i6", "i7"]),
      step("s5", "Faites gratiner sous le gril du four 5 minutes, jusqu'à ce que le fromage bouillonne.", [], [{ label: "Gratiner", seconds: 300 }]),
    ],
  }),

  pancakes: recipe({
    title: "Buttermilk pancakes",
    times: { prep: 10, cook: 15, total: 25 },
    servings: { amount: 8, label: "pancakes", text: "Makes 8" },
    ingredients: [
      ing("i1", "[[200]] g plain flour", "plain flour"),
      ing("i2", "[[2]] tsp baking powder", "baking powder"),
      ing("i3", "[[1]] tbsp sugar", "sugar"),
      ing("i4", "[[0.25]] tsp salt", "salt"),
      ing("i5", "[[1|w]] large egg", "egg"),
      ing("i6", "[[300]] ml buttermilk", "buttermilk"),
      ing("i7", "[[2]] tbsp melted butter, plus extra for the pan", "butter"),
    ],
    steps: [
      step("s1", "Whisk the flour, baking powder, sugar and salt in a large bowl.", ["i1", "i2", "i3", "i4"]),
      step("s2", "In a jug, whisk the egg, buttermilk and melted butter, then pour into the dry ingredients and stir until just combined. A few lumps are fine.", ["i5", "i6", "i7"]),
      step("s3", "Heat a non-stick frying pan over a medium heat and brush with a little butter.", ["i7"]),
      step("s4", "Pour in a ladle of batter per pancake and cook for 2 minutes, until bubbles appear on top, then flip and cook for 1 minute more.", [], [
        { label: "Cook first side", seconds: 120 },
        { label: "Cook second side", seconds: 60 },
      ]),
    ],
  }),
};
