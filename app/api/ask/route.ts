import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BACKEND_COLLECTIONS, COLLECTION_DATA } from '@/lib/backendCollections';

interface UploadedDocument {
  id?: string;
  name: string;
  size: number;
}

interface AskRequestBody {
  question?: unknown;
  searchMode?: unknown;
  documents?: unknown;
  selectedTopicId?: unknown;
}

const GEMINI_TIMEOUT_MS = 10000;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';

const isUploadedDocument = (document: unknown): document is UploadedDocument => {
  if (!document || typeof document !== 'object') return false;

  const candidate = document as Partial<UploadedDocument>;
  return typeof candidate.name === 'string' && typeof candidate.size === 'number';
};

const buildFallbackAnswer = ({
  question,
  searchMode,
  documents,
  selectedTopicId,
}: {
  question: string;
  searchMode: string;
  documents: UploadedDocument[];
  selectedTopicId?: number;
}) => {
  if (searchMode === 'upload') {
    const names = documents.map((document) => `${document.name} (${(document.size / 1024).toFixed(1)} KB)`).join(', ');

    return `I could not reach the configured AI provider, so here is a local fallback. I found ${documents.length} uploaded document${
      documents.length === 1 ? '' : 's'
    }: ${names}. For "${question}", verify the key terms in those files and narrow the question to the relevant section for a stronger answer.`;
  }

  if (searchMode === 'topic' && selectedTopicId) {
    const selectedCollection = BACKEND_COLLECTIONS.find((collection) => collection.id === selectedTopicId);
    const topicData = COLLECTION_DATA[selectedTopicId] ?? [];

    if (selectedCollection) {
      return `I could not reach the configured AI provider, so here is a local fallback for ${selectedCollection.name}. ${
        selectedCollection.description
      }. Relevant notes: ${topicData.join(' ')}. Question received: "${question}".`;
    }
  }

  const matchingTopics = BACKEND_COLLECTIONS.filter((collection) => {
    const haystack = `${collection.name} ${collection.category} ${collection.description}`.toLowerCase();
    return question
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
      .some((term) => haystack.includes(term));
  }).slice(0, 5);

  const topicSummary =
    matchingTopics.length > 0
      ? matchingTopics.map((collection) => `${collection.name}: ${collection.description}`).join(' ')
      : `The knowledge base contains ${BACKEND_COLLECTIONS.length} curated topics across AI, data, security, cloud, and software engineering.`;

  return `I could not reach the configured AI provider, so here is a local fallback. ${topicSummary} Question received: "${question}".`;
};

const getProviderErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('[429') || message.toLowerCase().includes('quota')) {
    return 'Gemini quota or rate limit was reached. Try again later, use another Gemini model, or check billing/quota in Google AI Studio.';
  }

  if (message.includes('[404') || message.toLowerCase().includes('not found')) {
    return `Gemini model "${GEMINI_MODEL}" is not available for this API key.`;
  }

  if (message.toLowerCase().includes('api key')) {
    return 'Gemini API key is missing, invalid, or restricted.';
  }

  if (message.toLowerCase().includes('timed out')) {
    return 'Gemini request timed out.';
  }

  return 'Gemini provider request failed.';
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    let body: AskRequestBody;

    try {
      body = (await request.json()) as AskRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const searchMode = typeof body.searchMode === 'string' ? body.searchMode : 'search';
    const documents = Array.isArray(body.documents) ? body.documents.filter(isUploadedDocument) : [];
    const selectedTopicId =
      typeof body.selectedTopicId === 'number' && Number.isFinite(body.selectedTopicId) ? body.selectedTopicId : undefined;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    let context = '';

    // Handle different search modes
    if (searchMode === 'upload') {
      if (documents.length === 0) {
        return NextResponse.json({ error: 'Please upload documents first' }, { status: 400 });
      }
      const documentNames = documents.map((doc) => `${doc.name} (${(doc.size / 1024).toFixed(1)} KB)`).join(', ');
      context = `You are analyzing these uploaded documents: ${documentNames}`;
    } else if (searchMode === 'topic') {
      const selectedCollection = BACKEND_COLLECTIONS.find((c) => c.id === selectedTopicId);
      const topicData = selectedTopicId ? COLLECTION_DATA[selectedTopicId] : undefined;

      if (selectedCollection) {
        context = `You are answering questions about: "${selectedCollection.name}" (${selectedCollection.category})\n\nDescription: ${selectedCollection.description}\n\nKnowledge Base:\n${
          topicData ? topicData.join('\n') : 'Information available in this topic.'
        }`;
      }
    } else {
      // Normal search mode - use all backend collections
      const allTopics = BACKEND_COLLECTIONS.map((c) => c.name).join(', ');
      context = `You have access to a comprehensive knowledge base covering these topics: ${allTopics}. Use your knowledge to answer the question.`;
    }

    const prompt = `${context}

User Question: "${question}"

Please provide a helpful, accurate, and detailed answer.`;

    if (!apiKey) {
      return NextResponse.json({
        answer: buildFallbackAnswer({ question, searchMode, documents, selectedTopicId }),
        source: 'local-fallback',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Gemini request timed out')), GEMINI_TIMEOUT_MS);
        }),
      ]);
      const text = result.response.text();

      return NextResponse.json({ answer: text, source: 'gemini' });
    } catch (providerError) {
      console.warn('Gemini provider failed; returning local fallback.', providerError);

      return NextResponse.json({
        answer: buildFallbackAnswer({ question, searchMode, documents, selectedTopicId }),
        providerError: getProviderErrorMessage(providerError),
        source: 'local-fallback',
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to process your question: ${errorMessage}` }, { status: 500 });
  }
}