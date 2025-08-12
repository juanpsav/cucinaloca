'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, RotateCcw, Clock, Flame, Utensils, Leaf, Bot } from 'lucide-react';
import { Recipe } from '../types/recipe';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
}

const promptSuggestions = [
  { icon: Clock, text: "How long does this take?" },
  { icon: Flame, text: "Can I adjust the spice level?" },
  { icon: Utensils, text: "What tools do I need?" },
  { icon: Leaf, text: "How can I make this vegetarian?" }
];

export default function ChatModal({ isOpen, onClose, recipe }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your recipe assistant. Ask me anything about this recipe, cooking techniques, ingredient substitutions, or any other culinary questions.`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Hi! I'm your recipe assistant. Ask me anything about this recipe, cooking techniques, ingredient substitutions, or any other culinary questions.`,
        timestamp: new Date()
      }
    ]);
    setInputMessage('');
  };

  const handlePromptSuggestion = (text: string) => {
    setInputMessage(text);
    inputRef.current?.focus();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Prepare conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          recipe,
          conversationHistory
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant response to chat
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Branded styling */}
      <div className="relative w-full max-w-3xl h-[80vh] bg-cream rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sage-green/20 bg-gradient-to-r from-cream to-lemon-cream/30">
          <div className="flex items-center gap-3">
            {/* Robot Avatar - branded colors */}
            <div className="w-8 h-8 bg-sage-green rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-cream" />
            </div>
            <div>
              <h2 className="font-playfair text-lg font-bold text-sage-green">Recipe Assistant</h2>
              <p className="text-xs text-sage-green/70">Powered by OpenAI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetChat}
              className="p-1.5 hover:bg-sage-green/10 rounded-lg transition-colors group"
              title="Reset chat"
            >
              <RotateCcw className="h-4 w-4 text-sage-green/70 group-hover:text-sage-green" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-sage-green/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-sage-green/70 hover:text-sage-green" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-lemon-cream/20 to-cream">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 bg-sage-green rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3.5 w-3.5 text-cream" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-blood-orange text-cream ml-auto'
                      : 'bg-white border border-sage-green/20 text-sage-green shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</div>
                  <div className={`text-xs mt-1.5 ${
                    message.role === 'user' ? 'text-cream/80' : 'text-sage-green/60'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 bg-sage-green/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sage-green font-bold text-xs">U</span>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 bg-sage-green rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-cream" />
                </div>
                <div className="bg-white border border-sage-green/20 rounded-xl px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2 text-sage-green text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Prompt Suggestions - Branded styling */}
        {messages.length === 1 && (
          <div className="px-4 py-3 border-t border-sage-green/20">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-wrap gap-1.5">
                {promptSuggestions.map((suggestion, index) => {
                  const IconComponent = suggestion.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handlePromptSuggestion(suggestion.text)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-sage-green bg-white border border-sage-green/30 rounded-full hover:bg-lemon-cream/30 hover:border-sage-green/50 transition-all duration-150"
                    >
                      <IconComponent className="h-3 w-3 text-sage-green/70" />
                      <span>{suggestion.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-sage-green/20 p-4 bg-cream">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about this recipe..."
                className="flex-1 px-3 py-2 text-sm border border-sage-green/30 rounded-lg focus:ring-2 focus:ring-sage-green/50 focus:border-sage-green transition-all text-sage-green placeholder-sage-green/50 bg-white"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="px-4 py-2 bg-blood-orange hover:bg-blood-orange/90 text-cream rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[50px]"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 