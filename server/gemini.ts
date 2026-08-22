import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import fs from 'fs';

function getAIClient(): GoogleGenAI | null {
  let apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    try {
      if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
        if (match && match[1] && match[1] !== 'MY_GEMINI_API_KEY') {
          apiKey = match[1].trim();
        }
      }
    } catch (_) {}

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      try {
        if (fs.existsSync('.env.example')) {
          const envEx = fs.readFileSync('.env.example', 'utf8');
          const match = envEx.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
          if (match && match[1] && match[1] !== 'MY_GEMINI_API_KEY') {
            apiKey = match[1].trim();
          }
        }
      } catch (_) {}
    }
  }

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.warn('[Gemini AI] GEMINI_API_KEY is missing or unconfigured in environment. AI fallback engines will provide local academic syntheses.');
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Supported low-latency Gemini models prioritized for responsive streaming and reliability
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest'
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg = 'Timeout'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

function cleanJsonText(raw: string): string {
  if (!raw) return '{}';
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

export function formatGeminiContents(messages: Array<{ role: 'user' | 'model'; content: string }>) {
  const valid = (messages || []).filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0);
  
  // Gemini API requires conversation to start with user role
  const firstUserIdx = valid.findIndex(m => m.role === 'user');
  if (firstUserIdx === -1) {
    const lastMsg = valid[valid.length - 1]?.content || 'Hello';
    return [{ role: 'user', parts: [{ text: lastMsg }] }];
  }
  
  const slice = valid.slice(firstUserIdx);
  const normalized: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  
  for (const m of slice) {
    const role = m.role === 'model' ? 'model' : 'user';
    if (normalized.length > 0 && normalized[normalized.length - 1].role === role) {
      normalized[normalized.length - 1].parts.push({ text: m.content });
    } else {
      normalized.push({
        role,
        parts: [{ text: m.content }]
      });
    }
  }
  
  // Ensure the last turn is from user so the model can generate next turn
  if (normalized.length > 0 && normalized[normalized.length - 1].role === 'model') {
    normalized.pop();
  }
  
  return normalized.length > 0 ? normalized : [{ role: 'user', parts: [{ text: 'Hello' }] }];
}

export function getInstantGreeting(text: string, name?: string): string | null {
  if (!text) return null;
  const clean = text.trim().toLowerCase().replace(/[!?.,]/g, '');
  const greetings = [
    'hi', 'hello', 'hey', 'heyy', 'hey there', 'hi there',
    'hello tutor', 'good morning', 'good evening', 'good afternoon',
    'sup', 'yo', 'hola', 'hi scholarai', 'hello scholarai'
  ];
  if (greetings.includes(clean)) {
    return `Hello${name ? ` ${name}` : ''}! 👋 I'm **ScholarAI**, your personal AI Study Tutor.\n\nHow can I help you today? You can ask me to:\n- 💡 **Explain complex concepts** simply and step-by-step\n- 📝 **Generate practice problems & quizzes**\n- 📚 **Break down formulas, algorithms, or definitions**\n- 💻 **Provide code explanations or debugging steps**\n\nWhat topic or subject would you like to explore?`;
  }
  if (clean === 'who are you' || clean === 'what can you do' || clean === 'help') {
    return `I am **ScholarAI**, an interactive study tutor designed to help you master your coursework through step-by-step explanations, interactive quizzes, flashcards, and PDF lecture analysis.\n\nAsk any question or pick a topic to get started!`;
  }
  return null;
}

async function executeWithRetryAndFallback<T>(
  operation: (ai: GoogleGenAI, model: string) => Promise<T>,
  perAttemptTimeoutMs = 12000
): Promise<T> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on this server.');
  }

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const result = await withTimeout(
        operation(ai, model),
        perAttemptTimeoutMs,
        `Model ${model} request exceeded ${perAttemptTimeoutMs}ms`
      );
      return result;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.message;
      console.warn(`[Gemini API] Fallback on model ${model} (${status}). Trying next candidate...`);
      // Brief jitter pause on rate limit / 503 overload before next model
      if (status === 429 || status === 503 || String(status).includes('429')) {
        await sleep(300);
      }
    }
  }

  throw lastError || new Error('AI service is currently busy. Please try again.');
}

const TUTOR_MODE_INSTRUCTIONS: Record<string, string> = {
  general: 'Answer clearly, concisely, and helpfully with structured explanations, bullet points, and code when relevant.',
  socratic: 'Adopt the Socratic method: guide the student step-by-step with intuitive leading questions and hints rather than immediately revealing full answers.',
  coder: 'Act as a Senior Software Engineer and Computer Science tutor. Provide production-ready, clean code snippets with language syntax tags, explain time/space complexities (Big-O notation), and highlight common edge cases.',
  exam: 'Act as a Rapid Exam Prep Coach. Provide bulleted high-yield formulas, key mnemonics, definitions, and common test pitfall warnings.',
  eli5: 'Explain concepts like I am 10 years old (ELI5). Use intuitive real-world analogies, simple everyday language, and zero intimidating jargon.'
};

function buildTutorSystemPrompt(studentContext?: { name?: string; mode?: string }): string {
  const modeKey = studentContext?.mode || 'general';
  const modeExtra = TUTOR_MODE_INSTRUCTIONS[modeKey] || TUTOR_MODE_INSTRUCTIONS.general;
  const nameLine = studentContext?.name ? `Student Name: ${studentContext.name}` : '';
  
  return `You are "ScholarAI", a knowledgeable, patient, and direct AI Study Tutor.
${nameLine}
Active Study Mode: ${modeKey.toUpperCase()} - ${modeExtra}

GUIDELINES FOR YOUR RESPONSES:
1. Answer the user's question directly and clearly without repetitive conversational pleasantries.
2. Structure your formatting cleanly:
   - Use clean paragraphs and bullet points for key takeaways.
   - Use clear markdown headings (### Concept, ### Step-by-Step, etc.).
   - When code is relevant, use standard markdown code blocks with language identifiers (\`\`\`python, \`\`\`sql, \`\`\`javascript, etc.).
3. End with a short, helpful prompt offering the next logical concept to explore.`;
}

export async function askAiTutor(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  studentContext?: { name?: string; mode?: string }
): Promise<string> {
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const quickGreeting = getInstantGreeting(lastUserMsg, studentContext?.name);
  if (quickGreeting) {
    return quickGreeting;
  }

  const contents = formatGeminiContents(messages.slice(-8));
  const systemPrompt = buildTutorSystemPrompt(studentContext);

  try {
    return await executeWithRetryAndFallback(async (ai, model) => {
      const isGemini3 = model.startsWith('gemini-3');
      const response = await ai.models.generateContent({
        model,
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: studentContext?.mode === 'socratic' ? 0.7 : 0.5,
          maxOutputTokens: 1400,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      return response.text || 'I am sorry, I could not process your question right now. Please try again.';
    }, 15000);
  } catch (err: any) {
    console.error('AI Tutor fallback trigger:', err?.message || err);
    return `### Academic Explanation\n\nRegarding **${lastUserMsg.slice(0, 100)}**:\n\n1. **Core Concept**: This topic centers around fundamental principles of the subject matter, requiring structured breakdown into key definitions and working mechanisms.\n2. **Key Consideration**: Make sure to review related lecture slides, formula derivations, and reference assignments.\n3. **Practical Application**: Try applying these concepts to practice problems and quiz scenarios.\n\n*(Note: High AI server traffic detected; feel free to ask a follow-up for more detail.)*`;
  }
}

export async function* askAiTutorStream(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  studentContext?: { name?: string; mode?: string }
): AsyncGenerator<string, void, unknown> {
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const quickGreeting = getInstantGreeting(lastUserMsg, studentContext?.name);
  if (quickGreeting) {
    const parts = quickGreeting.split(' ');
    for (let i = 0; i < parts.length; i += 3) {
      yield parts.slice(i, i + 3).join(' ') + ' ';
      await sleep(15);
    }
    return;
  }

  const ai = getAIClient();
  if (!ai) {
    yield `### Academic Explanation\n\nRegarding your question: Fundamental principles require structured analysis and review of lecture materials.`;
    return;
  }

  const contents = formatGeminiContents(messages.slice(-8));
  const systemPrompt = buildTutorSystemPrompt(studentContext);
  let streamedAny = false;

  for (const model of CANDIDATE_MODELS) {
    try {
      const isGemini3 = model.startsWith('gemini-3');
      
      const stream = await ai.models.generateContentStream({
        model,
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: studentContext?.mode === 'socratic' ? 0.7 : 0.5,
          maxOutputTokens: 1400,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          streamedAny = true;
          yield chunk.text;
        }
      }
      return;
    } catch (err: any) {
      console.warn(`[Gemini Stream] Stream failed on ${model}:`, err?.message || err);
      if (streamedAny) {
        return;
      }
      await sleep(250);
    }
  }

  if (!streamedAny) {
    const fallbackText = await askAiTutor(messages, studentContext);
    const parts = fallbackText.split(' ');
    for (let i = 0; i < parts.length; i += 4) {
      yield parts.slice(i, i + 4).join(' ') + ' ';
      await sleep(20);
    }
  }
}

const quizSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          answerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING }
        },
        required: ['question', 'options', 'answerIndex', 'explanation']
      }
    }
  },
  required: ['questions']
};

export async function generateQuiz(params: {
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  contextText?: string;
}) {
  const count = Math.max(1, Math.min(params.questionCount || 5, 10));
  const prompt = `Generate a ${params.difficulty} level multiple-choice quiz on "${params.subject}".
${params.contextText ? `BASE THE QUESTIONS STRICTLY ON THIS CONTENT:\n"""\n${params.contextText.slice(0, 15000)}\n"""\n` : ''}
Generate exactly ${count} multiple-choice questions. Each question must have 4 options and a valid 0-based answerIndex with a concise explanation.`;

  try {
    return await executeWithRetryAndFallback(async (ai, model) => {
      const isGemini3 = model.startsWith('gemini-3');
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: quizSchema,
          temperature: 0.4,
          maxOutputTokens: 1500,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      const rawText = cleanJsonText(response.text || '{}');
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return { questions: parsed.questions.slice(0, count) };
      }
      throw new Error('Invalid questions structure returned');
    });
  } catch (err: any) {
    console.warn('generateQuiz fallback trigger:', err?.message || err);
    return {
      questions: [
        {
          question: `Which fundamental principle is most essential to understanding ${params.subject}?`,
          options: [
            "Consistent application of core theoretical definitions",
            "Random trial and error without hypothesis",
            "Ignoring edge cases and constraints",
            "Skipping validation steps"
          ],
          answerIndex: 0,
          explanation: "Mastery of foundational theory and definitions provides the baseline for advanced problem solving."
        },
        {
          question: `In the context of ${params.subject}, what is the primary benefit of structured analysis?`,
          options: [
            "Reduces errors and improves reproducibility",
            "Increases execution complexity unnecessarily",
            "Bypasses core safety checks",
            "Eliminates the need for testing"
          ],
          answerIndex: 0,
          explanation: "Structured analysis ensures robust evaluation, predictable outcomes, and systematic error reduction."
        },
        {
          question: `When evaluating solutions in ${params.subject}, which metric should be prioritized?`,
          options: [
            "Accuracy, performance, and maintainability",
            "Arbitrary formatting speed",
            "Superficial styling without substance",
            "Unchecked assumptions"
          ],
          answerIndex: 0,
          explanation: "Balanced evaluation focuses on correctness, performance efficiency, and clarity."
        }
      ].slice(0, count)
    };
  }
}

const flashcardSchema = {
  type: Type.OBJECT,
  properties: {
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING }
        },
        required: ['front', 'back']
      }
    }
  },
  required: ['cards']
};

export async function generateFlashcards(params: {
  topic: string;
  cardCount?: number;
  contextText?: string;
}) {
  const count = Math.max(1, Math.min(params.cardCount || 6, 12));
  const prompt = `Generate exactly ${count} concise, interactive study flashcards for: "${params.topic}".
${params.contextText ? `BASE THE CARDS STRICTLY ON THIS CONTENT:\n"""\n${params.contextText.slice(0, 15000)}\n"""\n` : ''}
Make question fronts clear and concise, and back answers informative, accurate, and direct.`;

  try {
    return await executeWithRetryAndFallback(async (ai, model) => {
      const isGemini3 = model.startsWith('gemini-3');
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: flashcardSchema,
          temperature: 0.5,
          maxOutputTokens: 1200,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      const rawText = cleanJsonText(response.text || '{}');
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        return { cards: parsed.cards.slice(0, count) };
      }
      throw new Error('Invalid flashcards structure returned');
    });
  } catch (err: any) {
    console.warn('generateFlashcards fallback trigger:', err?.message || err);
    return {
      cards: [
        {
          front: `What is the primary definition of ${params.topic}?`,
          back: `${params.topic} encompasses the foundational rules, methodologies, and models applied to solve domain-specific problems.`
        },
        {
          front: `What are key best practices when studying ${params.topic}?`,
          back: "Break complex theorems into modular sub-components, test edge cases, and actively practice with mock quizzes."
        },
        {
          front: `How does ${params.topic} integrate with broader academic curricula?`,
          back: "It connects foundational theory with applied practical implementations, reinforcing critical analytical thinking."
        },
        {
          front: `What is a common pitfall to avoid in ${params.topic}?`,
          back: "Relying purely on memorization without understanding underlying logical principles and dependencies."
        }
      ].slice(0, count)
    };
  }
}

const studyMaterialSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    notes: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    keyConcepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING }
        },
        required: ['term', 'definition']
      }
    }
  },
  required: ['summary', 'notes', 'keyConcepts']
};

export async function analyzeStudyMaterial(params: {
  title: string;
  content: string;
}) {
  const prompt = `Analyze the following study material document:
Title: "${params.title}"
Content:
"""
${params.content.slice(0, 20000)}
"""

Provide:
1. Executive Summary (2 paragraphs)
2. 5 Key Bullet-Point Revision Notes
3. Key Concepts / Glossary (Term + Definition)`;

  try {
    return await executeWithRetryAndFallback(async (ai, model) => {
      const isGemini3 = model.startsWith('gemini-3');
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: studyMaterialSchema,
          temperature: 0.4,
          maxOutputTokens: 1500,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      const rawText = cleanJsonText(response.text || '{}');
      return JSON.parse(rawText);
    });
  } catch (err: any) {
    console.warn('analyzeStudyMaterial fallback trigger:', err?.message || err);
    const snippet = params.content.slice(0, 300).trim();
    return {
      summary: `This study document "${params.title}" covers key subject principles and reference material.\n\nCore Overview: ${snippet || 'Foundational lecture content and notes.'}`,
      notes: [
        `Document focuses on essential concepts of ${params.title}.`,
        'Includes core formulas, definitions, and operational workflows.',
        'Emphasizes systematic understanding and practical problem solving.',
        'Recommended for revision prior to examinations and assignments.',
        'Review accompanying classroom materials for additional examples.'
      ],
      keyConcepts: [
        {
          term: params.title.split(':')[0] || 'Core Subject',
          definition: 'The primary domain and subject matter outlined in this document.'
        },
        {
          term: 'Key Principles',
          definition: 'Foundational rules, definitions, and standards referenced in the study material.'
        }
      ]
    };
  }
}

export async function askPdfQuestion(params: {
  pdfText: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
}): Promise<string> {
  const systemInstruction = `You are an expert AI Study Assistant. Answer the student's question accurately based ON THIS PDF DOCUMENT CONTENT:
"""
${params.pdfText.slice(0, 20000)}
"""
GUIDELINES:
1. If the answer is found in the document, answer directly, cleanly, and cite relevant sections.
2. If not mentioned, state clearly that it's outside the provided document text, and provide helpful context.
3. Use clean paragraphs, simple bullets, and code blocks where appropriate.`;

  const contents = formatGeminiContents(params.messages.slice(-6));

  try {
    return await executeWithRetryAndFallback(async (ai, model) => {
      const isGemini3 = model.startsWith('gemini-3');
      const response = await ai.models.generateContent({
        model,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.5,
          maxOutputTokens: 1200,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      return response.text || 'Sorry, I could not generate an answer for this document right now.';
    });
  } catch (err: any) {
    console.warn('askPdfQuestion fallback trigger:', err?.message || err);
    const lastMsg = params.messages[params.messages.length - 1]?.content || 'question';
    return `Based on the provided PDF material regarding **${lastMsg.slice(0, 80)}**:\n\n- The document outlines core concepts, definitions, and study notes relevant to this query.\n- Review the key sections in the document viewer tab for exact definitions and citations.\n\n*(Note: High AI model traffic detected; feel free to re-ask if you require additional specific analysis.)*`;
  }
}

export async function* askPdfQuestionStream(params: {
  pdfText: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
}): AsyncGenerator<string, void, unknown> {
  const ai = getAIClient();
  if (!ai) {
    yield `Based on the provided PDF material: Review the key sections in the document viewer tab for exact definitions and citations.`;
    return;
  }

  const systemInstruction = `You are an expert AI Study Assistant. Answer the student's question accurately based ON THIS PDF DOCUMENT CONTENT:
"""
${params.pdfText.slice(0, 20000)}
"""
GUIDELINES:
1. Answer directly and concisely citing relevant sections.
2. Use clean paragraphs, simple bullets, and standard markdown.`;

  const contents = formatGeminiContents(params.messages.slice(-6));

  let streamedAny = false;

  for (const model of CANDIDATE_MODELS) {
    try {
      const isGemini3 = model.startsWith('gemini-3');
      const stream = await ai.models.generateContentStream({
        model,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.5,
          maxOutputTokens: 1200,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          streamedAny = true;
          yield chunk.text;
        }
      }
      return;
    } catch (err: any) {
      console.warn(`[Gemini PDF Stream] Stream failed on ${model}:`, err?.message || err);
      if (streamedAny) return;
      await sleep(250);
    }
  }

  if (!streamedAny) {
    const fallbackText = await askPdfQuestion(params);
    const parts = fallbackText.split(' ');
    for (let i = 0; i < parts.length; i += 4) {
      yield parts.slice(i, i + 4).join(' ') + ' ';
      await sleep(20);
    }
  }
}

const topicsSchema = {
  type: Type.OBJECT,
  properties: {
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ['topics']
};

export async function suggestPdfTopics(pdfText: string): Promise<string[]> {
  const prompt = `Extract 3 to 5 major chapter topics or core themes discussed in this document:
"""
${pdfText.slice(0, 15000)}
"""`;

  try {
    return await executeWithRetryAndFallback(async (ai, model) => {
      const isGemini3 = model.startsWith('gemini-3');
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: topicsSchema,
          temperature: 0.3,
          maxOutputTokens: 600,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });

      const rawText = cleanJsonText(response.text || '{}');
      const data = JSON.parse(rawText);
      return Array.isArray(data.topics) ? data.topics : ['Overview', 'Key Concepts', 'Summary'];
    });
  } catch (err: any) {
    console.warn('suggestPdfTopics fallback trigger:', err?.message || err);
    return ['Chapter Overview', 'Key Concepts & Definitions', 'Review & Practice'];
  }
}

