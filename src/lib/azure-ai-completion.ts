// lib/azureAI.ts
import { isUnexpected } from '@azure-rest/ai-inference';
import azureClient from './azure-ai-client';
import { AI_SYSTEM_PROMPT } from '../configs/consts';

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

  const systemPrompt = AI_SYSTEM_PROMPT(sanitizedRole);

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