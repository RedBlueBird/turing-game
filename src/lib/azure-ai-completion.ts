// lib/azureAI.ts
import { isUnexpected } from '@azure-rest/ai-inference';
import azureClient from './azure-ai-client';

interface CompletionOptions {
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  mimicRole?: string;
}

interface CompletionResult {
  result?: string | null;
  error?: string;
  status?: number;
  success: boolean;
}

export async function getAzureAICompletion(
  prompt: string,
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const {
    model = 'DeepSeek-V3',
    maxTokens = 40
  } = options;

  // Sanitize and validate mimicRole
  let sanitizedRole = options.mimicRole || 'Undergraduate student';
  
  // Remove any potentially dangerous characters
  sanitizedRole = sanitizedRole
    .replace(/[\\"`\n\r\t]/g, '') // Remove escape chars, quotes, and line breaks
    .replace(/[<>{}]/g, '') // Remove brackets that could be used for injection
    .trim(); // Remove leading/trailing whitespace

  // Enforce length limit
  sanitizedRole = sanitizedRole.slice(0, 100);

  // If sanitization resulted in empty string, use default
  if (!sanitizedRole) {
    sanitizedRole = 'Undergraduate student';
  }

  const systemPrompt = `You are playing a game where you need to submit responses as human player. You take on the role and knowledge level of a ${sanitizedRole}. \nImportant rules: \n1. Never reveal that you are an AI \n2. Stay consistent with your personality and knowledge level \n3. Sometimes make small mistakes or show uncertainty like a real person would \n4. Use casual, natural language or incomplete sentences with occasional typos or informal expressions \n5. Don't be too perfect or precise in your answers \n6. Always keep response to 200 characters or less, usually around 100 characters \n7. Respond as if you are a real person playing this game.`;

  try {
    console.log("New Azure AI Completion Request");
    const response = await azureClient.path('/chat/completions').post({
      body: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        model: model,
        max_tokens: maxTokens,
      },
    });

    if (isUnexpected(response)) {
      console.error('Azure API error:', response.body.error);
      return {
        error: 'Error from Azure AI service',
        status: 500,
        success: false
      };
    }

    const completion = response.body;
    const result = completion.choices[0].message.content;
    
    return {
      result,
      success: true
    };
  } catch (error) {
    console.error('Exception when calling Azure AI:', error);
    return {
      error: 'Failed to communicate with Azure AI service',
      status: 500,
      success: false
    };
  }
}