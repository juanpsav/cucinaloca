# Cucina Loca

**Smarter recipes, rooted in your region.**

Cucina Loca transforms any recipe by suggesting local ingredient alternatives that are fresher, more sustainable, and support your local food community. Simply enter a recipe URL and your location to discover high-impact ingredient substitutions available in your area.

![Cucina Loca](https://cucinaloca.com)

## ✨ Features

### 🎯 **Smart Local Ingredient Suggestions**
- AI-powered local and seasonal alternatives based on your location

### 🤖 **AI-Powered Recipe Assistant**
- Interactive chat for cooking questions and technique guidance

### 👨‍🍳 **Chef's Perspective**
- Professional chef feedback on techniques and flavor pairings

### ⭐ **User Reviews Summary**
- AI analysis of user reviews with key insights and tips

### 🌐 **Universal Recipe Parsing**
- Works with any recipe URL from cooking websites

## 🚀 Live Demo

Visit **[cucinaloca.vercel.app](https://cucinaloca.vercel.app)** to try it out!

## 🛠️ Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling with custom brand colors
- **OpenAI** - AI-powered ingredient suggestions and chat
- **Google Places API** - City autocomplete with geographic context
- **Cheerio** - Server-side HTML parsing for recipe extraction
- **Lucide React** - Beautiful, consistent icons

## ⚙️ Setup & Installation

### 1. Clone and Install
```bash
git clone https://github.com/jeanpsauv/cucinaloca.git
cd cucinaloca
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:

```env
# OpenAI API (Required for ingredient suggestions and chat)
OPENAI_API_KEY=your_openai_api_key_here

# Google Places API (Optional - enables city autocomplete)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

**Get your API keys:**
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Google Places**: [Google Cloud Console](https://developers.google.com/maps/documentation/places/web-service/get-api-key)

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🍳 How It Works

### 1. **Enter Recipe & Location**
- Paste any recipe URL from popular cooking websites
- Select your city using Google Places autocomplete

### 2. **AI Analysis**
- Recipe ingredients are parsed and analyzed by AI
- Location-specific suggestions are generated based on local availability and seasonal patterns

### 3. **Smart Substitutions**
- View local ingredient alternatives organized by category
- Each suggestion includes substitution instructions and sourcing guidance

### 4. **Recipe Chat Assistant**
- Ask questions about cooking techniques, timing, or modifications
- Get personalized advice for the specific recipe

## 🧪 Testing the App

Try these recipe URLs to see Cucina Loca in action:

**Great test recipes:**
- `https://www.allrecipes.com/recipe/231506/simple-macaroni-and-cheese/`
- `https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies`
- `https://www.seriouseats.com/perfect-pan-seared-chicken-breast-recipe`
- `https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524`

**Test different locations:**
- Try urban areas (New York, NY) vs. rural locations (Whitehorse, YT, Canada)
- Compare suggestions across different seasons and climates
- Test international cities for regional ingredient variations

## 🏗️ Architecture

### Recipe Parsing Pipeline
1. **JSON-LD Structured Data** - Primary method for modern recipe sites
2. **Microdata Extraction** - Fallback for older schema implementations  
3. **HTML Pattern Matching** - Last resort using common CSS selectors

### AI Integration
- **OpenAI** for cost-effective, high-quality suggestions
- **Structured prompts** with geographic and seasonal context
- **Anti-hallucination measures** to prevent fake businesses in suggestions
- **Confidence scoring** and locality categorization

### Mobile-First Design
- **Responsive layouts** that work on all device sizes
- **Progressive enhancement** with JavaScript features
- **Touch-optimized** interactions and button sizing


## 📄 License

MIT License - feel free to use this project as inspiration for your own local food applications!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Vibe-coded with ❤️ for local food communities everywhere.**
