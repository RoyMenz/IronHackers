const env = require('../config/env');

function hasAzureOpenAiConfig() {
  return Boolean(env.azureOpenAiEndpoint && env.azureOpenAiApiKey && env.azureOpenAiDeployment);
}

function hasOpenAiConfig() {
  return Boolean(env.openaiApiKey);
}

function ensureTranslatorConfigured() {
  if (!hasAzureOpenAiConfig() && !hasOpenAiConfig()) {
    throw new Error(
      'Translator is not configured. Set either AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_API_KEY/AZURE_OPENAI_DEPLOYMENT or OPENAI_API_KEY in .env'
    );
  }
}

function normalizeEndpoint(endpoint) {
  return endpoint.trim().replace(/\/+$/, '');
}

async function readBodySafe(response) {
  const text = await response.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function getTextFromResponsesOutput(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const textChunks = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === 'string' && c.text.trim()) {
        textChunks.push(c.text.trim());
      }
      if (typeof c?.value === 'string' && c.value.trim()) {
        textChunks.push(c.value.trim());
      }
    }
  }

  return textChunks.join('\n').trim();
}

async function translateWithAzureOpenAi({ text, targetLanguage }) {
  const baseEndpoint = normalizeEndpoint(env.azureOpenAiEndpoint);
  const lower = baseEndpoint.toLowerCase();

  let url;
  let body;

  const isResponsesUrl = lower.includes('/openai/v1/responses');
  const usesV1 = lower.includes('/openai/v1');
  const includesChatCompletions = lower.includes('/chat/completions');

  if (isResponsesUrl) {
    url = baseEndpoint;
    body = {
      model: env.azureOpenAiDeployment,
      instructions:
        'You are a professional translator. Return only the translated text with no explanation or markdown.',
      input: `Translate the following text to ${targetLanguage}:\n\n${text}`,
    };
  } else if (usesV1) {
    url = includesChatCompletions ? baseEndpoint : `${baseEndpoint}/chat/completions`;
    body = {
      model: env.azureOpenAiDeployment,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator. Return only the translated text with no explanation or markdown.',
        },
        {
          role: 'user',
          content: `Translate the following text to ${targetLanguage}:\n\n${text}`,
        },
      ],
      temperature: 0,
    };
  } else {
    url = `${baseEndpoint}/openai/deployments/${env.azureOpenAiDeployment}/chat/completions?api-version=${encodeURIComponent(env.azureOpenAiApiVersion)}`;
    body = {
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator. Return only the translated text with no explanation or markdown.',
        },
        {
          role: 'user',
          content: `Translate the following text to ${targetLanguage}:\n\n${text}`,
        },
      ],
      temperature: 0,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'api-key': env.azureOpenAiApiKey,
    },
    body: JSON.stringify(body),
  });

  const { text: rawBody, json: payload } = await readBodySafe(response);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (rawBody ? `Azure OpenAI request failed (${response.status}): ${rawBody.slice(0, 300)}` : `Azure OpenAI request failed (${response.status})`);
    throw new Error(message);
  }

  const translatedText =
    getTextFromResponsesOutput(payload) || payload?.choices?.[0]?.message?.content?.trim() || '';

  if (!translatedText) {
    throw new Error('Azure OpenAI translation returned empty output');
  }

  return {
    provider: 'azure-openai',
    model: env.azureOpenAiDeployment,
    targetLanguage,
    translatedText,
  };
}

async function translateWithOpenAi({ text, targetLanguage }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openaiTranslationModel,
      input: [
        {
          role: 'system',
          content:
            'You are a professional translator. Return only the translated text with no explanation or markdown.',
        },
        {
          role: 'user',
          content: `Translate the following text to ${targetLanguage}:\n\n${text}`,
        },
      ],
    }),
  });

  const { text: rawBody, json: payload } = await readBodySafe(response);
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (rawBody ? `OpenAI request failed (${response.status}): ${rawBody.slice(0, 300)}` : `OpenAI request failed (${response.status})`);
    throw new Error(message);
  }

  const translatedText = payload?.output_text?.trim();
  if (!translatedText) {
    throw new Error('OpenAI translation returned empty output');
  }

  return {
    provider: 'openai',
    model: env.openaiTranslationModel,
    targetLanguage,
    translatedText,
  };
}

async function translateExtractedText({ text, targetLanguage = 'English' }) {
  ensureTranslatorConfigured();

  if (hasAzureOpenAiConfig()) {
    return translateWithAzureOpenAi({ text, targetLanguage });
  }

  return translateWithOpenAi({ text, targetLanguage });
}

async function chatWithAzureOpenAi({ documentText, documentTitle, question, responseLanguage }) {
  const baseEndpoint = normalizeEndpoint(env.azureOpenAiEndpoint);
  const lower = baseEndpoint.toLowerCase();

  let url;
  let body;

  const instructions = `You are an AI assistant.

- Answer only using the provided document
- The document is already translated, so do not translate again
- Give clear and simple answers
- If the user asks for a summary, provide a summary
- If the answer is not present in the document, reply exactly: Not found in document
- Always answer in ${responseLanguage}
- If the user asks in another language, still answer in ${responseLanguage}`;

  const prompt = `Document title: ${documentTitle || 'Uploaded PDF'}\n\nDocument:\n${documentText}\n\nUser question:\n${question}`;
  const isResponsesUrl = lower.includes('/openai/v1/responses');
  const usesV1 = lower.includes('/openai/v1');
  const includesChatCompletions = lower.includes('/chat/completions');

  if (isResponsesUrl) {
    url = baseEndpoint;
    body = {
      model: env.azureOpenAiDeployment,
      instructions,
      input: prompt,
    };
  } else if (usesV1) {
    url = includesChatCompletions ? baseEndpoint : `${baseEndpoint}/chat/completions`;
    body = {
      model: env.azureOpenAiDeployment,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    };
  } else {
    url = `${baseEndpoint}/openai/deployments/${env.azureOpenAiDeployment}/chat/completions?api-version=${encodeURIComponent(env.azureOpenAiApiVersion)}`;
    body = {
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'api-key': env.azureOpenAiApiKey,
    },
    body: JSON.stringify(body),
  });

  const { text: rawBody, json: payload } = await readBodySafe(response);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (rawBody
        ? `Azure OpenAI chat request failed (${response.status}): ${rawBody.slice(0, 300)}`
        : `Azure OpenAI chat request failed (${response.status})`);
    throw new Error(message);
  }

  const answer =
    getTextFromResponsesOutput(payload) || payload?.choices?.[0]?.message?.content?.trim() || '';

  if (!answer) {
    throw new Error('Azure OpenAI chat returned empty output');
  }

  return answer;
}

async function chatWithOpenAi({ documentText, documentTitle, question, responseLanguage }) {
  const instructions = `You are an AI assistant.

- Answer only using the provided document
- The document is already translated, so do not translate again
- Give clear and simple answers
- If the user asks for a summary, provide a summary
- If the answer is not present in the document, reply exactly: Not found in document
- Always answer in ${responseLanguage}
- If the user asks in another language, still answer in ${responseLanguage}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openaiTranslationModel,
      input: [
        { role: 'system', content: instructions },
        { role: 'system', content: `Document title: ${documentTitle || 'Uploaded PDF'}\n\nDocument:\n${documentText}` },
        { role: 'user', content: question },
      ],
    }),
  });

  const { text: rawBody, json: payload } = await readBodySafe(response);
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (rawBody ? `OpenAI chat request failed (${response.status}): ${rawBody.slice(0, 300)}` : `OpenAI chat request failed (${response.status})`);
    throw new Error(message);
  }

  const answer = payload?.output_text?.trim();
  if (!answer) {
    throw new Error('OpenAI chat returned empty output');
  }

  return answer;
}

async function answerQuestionFromDocument({
  documentText,
  documentTitle,
  question,
  responseLanguage = 'English',
}) {
  ensureTranslatorConfigured();

  if (hasAzureOpenAiConfig()) {
    return chatWithAzureOpenAi({ documentText, documentTitle, question, responseLanguage });
  }

  return chatWithOpenAi({ documentText, documentTitle, question, responseLanguage });
}

module.exports = {
  answerQuestionFromDocument,
  translateExtractedText,
};
