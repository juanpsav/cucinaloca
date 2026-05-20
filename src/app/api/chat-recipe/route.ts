import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
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

    // Build the conversation messages (filter out any system messages from history)
    const filteredHistory = (conversationHistory as Array<{ role: string; content: string }>)
      .filter(m => m.role === 'user' || m.role === 'assistant');

    const completion = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemMessage,
      messages: [
        ...filteredHistory as Array<{ role: 'user' | 'assistant'; content: string }>,
        { role: 'user', content: message },
      ],
    });

    const firstContent = completion.content[0];
    const assistantMessage = firstContent?.type === 'text' ? firstContent.text : null;

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