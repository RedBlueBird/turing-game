import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

// Check if environment variables are defined
if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
  throw new Error('Azure OpenAI API credentials are not properly configured in environment variables');
}

// Create credential from environment variable
const credential = new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY);

// Initialize the client
const azureClient = ModelClient(process.env.AZURE_OPENAI_ENDPOINT, credential);

export default azureClient;