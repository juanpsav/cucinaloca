import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, recipe, conversationHistory } = await request.json();

    if (!message || !recipe) {
      return NextResponse.json(
        { error: 'Message and recipe are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Build the system message with recipe context
    const systemMessage = `You are a helpful recipe assistant. You have access to the following recipe:

**Recipe Name:** ${recipe.name}
**Description:** ${recipe.description || 'No description provided'}
**Prep Time:** ${recipe.prepTime || 'Not specified'}
**Cook Time:** ${recipe.cookTime || 'Not specified'}
**Servings:** ${recipe.servings || 'Not specified'}

**Ingredients:**
${recipe.ingredients.map((ingredient: string, index: number) => `${index + 1}. ${ingredient}`).join('\n')}

**Instructions:**
${recipe.instructions.map((instruction: string, index: number) => `${index + 1}. ${instruction}`).join('\n')}

You should help users with:
- Questions about cooking techniques
- Ingredient substitutions
- Cooking tips and timing
- Recipe modifications (scaling, dietary restrictions)
- Troubleshooting cooking issues
- General culinary advice related to this recipe

Be helpful, friendly, and provide practical cooking advice. If asked about something completely unrelated to cooking or this recipe, politely redirect the conversation back to culinary topics.`;

    // Build the conversation messages
    const messages = [
      { role: 'system', content: systemMessage },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      max_tokens: 500,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: assistantMessage,
      success: true
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 