# Cucina Loca

Refine your recipes with local ingredient alternatives based on your location.

## Features

- **Recipe URL Input**: Paste any recipe URL to parse ingredients and instructions
- **City-based Search**: Uses Google Places Autocomplete for accurate city selection
- **Multi-Level Local Sourcing**: AI-powered suggestions with layered locality levels:
  - 🎯 **Hyper-Local** (0-25 miles): Specific local farms, farmers markets, nearby producers
  - 📍 **Regional** (25-200 miles): State/province-wide sources, regional distributors
  - 📍 **National**: Domestic producers vs. international imports
  - 🔍 **Continental**: Same continent sourcing to reduce global shipping
- **Confidence Scoring**: High/medium/low confidence levels for each suggestion with visual indicators
- **Clean UI**: Modern, responsive design with Tailwind CSS and intuitive color coding

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up API Keys:**
   - Create a `.env.local` file in the root directory
   - **Google Places API** (for city autocomplete):
     - Get your API key from [Google Cloud Console](https://developers.google.com/maps/documentation/places/web-service/get-api-key)
     - Add to `.env.local`: `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here`
   - **OpenAI API** (for local ingredient suggestions):
     - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
     - Add to `.env.local`: `OPENAI_API_KEY=your_openai_api_key_here`

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** to view the app

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Places API** - City autocomplete
- **Lucide React** - Icons

## How It Works

1. **Input**: Enter a recipe URL and your city (with Google Places autocomplete)
2. **Parse**: The app extracts recipe ingredients, instructions, and metadata
3. **Analyze**: AI analyzes each ingredient for sourcing alternatives at different locality levels:
   - Prioritizes high-confidence hyper-local options (specific farms, markets within 25 miles)
   - Includes regional alternatives (state/province-wide, 25-200 miles)
   - Suggests national options when local isn't available
   - Considers continental sources as better alternatives to global imports
4. **Display**: View original and local alternatives side-by-side with:
   - Color-coded locality levels
   - Confidence indicators
   - Specific sourcing information
   - Benefits and availability details

## Testing Recipe Parsing

The app can parse recipes from many popular recipe websites. Try these URLs to test the functionality:

**Recommended test URLs:**
- AllRecipes: `https://www.allrecipes.com/recipe/[recipe-id]/[recipe-name]/`
- Food Network: `https://www.foodnetwork.com/recipes/[chef-name]/[recipe-name]`
- Bon Appétit: `https://www.bonappetit.com/recipe/[recipe-name]`
- Serious Eats: `https://www.seriouseats.com/[recipe-name]`

**How it works:**
1. **JSON-LD Structured Data**: Parses Recipe schema markup (most reliable)
2. **Microdata**: Falls back to HTML microdata attributes
3. **HTML Pattern Matching**: Uses common CSS selectors as last resort

## Next Steps

- [x] Implement recipe parsing from URLs
- [ ] Add OpenAI integration for local ingredient suggestions
- [ ] Add error handling and validation improvements
- [ ] Implement data persistence
- [ ] Add recipe image display
- [ ] Add nutritional information parsing

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
