/**
 * Firebase Cloud Functions for AI Overview Extension v2.4.0
 * 
 * This function securely calls OpenRouter API without exposing the API key to clients.
 * The API key is stored as a Firebase environment variable and never sent to the extension.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Classify a search query into one of 11 predefined categories using LLM
 * 
 * Categories: technology, business, politics, entertainment, sports, 
 *             health, science, finance, education, travel, general
 * 
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @returns {Object} JSON with { topic: string } or { error: string }
 */
exports.classifyTopic = functions.https.onRequest(async (request, response) => {
  // Enable CORS for Chrome extension
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    // Verify Firebase Auth token (optional but recommended)
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Unauthorized. Missing Firebase Auth token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      response.status(401).json({ error: 'Invalid Firebase Auth token.' });
      return;
    }

    // Get query from request body
    const { query } = request.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      response.status(400).json({ error: 'Missing or invalid query parameter.' });
      return;
    }

    // Get OpenRouter API key from Firebase environment config
    const apiKey = functions.config().openrouter?.apikey;
    if (!apiKey) {
      console.error('OpenRouter API key not configured. Run: firebase functions:config:set openrouter.apikey="YOUR_KEY"');
      response.status(500).json({ error: 'API key not configured.' });
      return;
    }

    // Call OpenRouter API
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-overview-extension-de.web.app',
        'X-Title': 'AI Overview Tracker Extension'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are provided user generated search queries which may be in either English, Tagalog, Filipino, Hindi, or another language. You must first identify the language including if it is code-switched (uses multiple languages), after which you must translate it into English (if it is not already in English). Finally you must assign a relevant category to it so that we can group queries belonging to the same categories.

Provide the category you suggest the query belongs to in your response, the english language translation of the user query provided to you, and the detected language that the query was originally provided in. If the query is already in English, you may use "null" in place of the translation and state the language is "English", otherwise you should use "Filipino", "Tagalog", "Hindi", or any other language that the query was originally provided in.

You must only use the following response format, returning a 3-element array where each element is a string: [category, english_translation, language_detected]

Valid categories: technology, business, politics, entertainment, sports, health, science, finance, education, travel, general`
          },
          {
            role: 'user',
            content: `Classify this search query: "${query}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      console.error('OpenRouter API error:', openrouterResponse.status, errorText);
      response.status(500).json({ error: 'OpenRouter API request failed.' });
      return;
    }

    const data = await openrouterResponse.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();

    // Parse the LLM response as JSON array: [category, english_translation, language_detected]
    let category, translation, language;
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed) && parsed.length === 3) {
        [category, translation, language] = parsed;
        category = category.toLowerCase().trim();
        translation = translation === 'null' ? null : translation;
        language = language.trim();
      } else {
        throw new Error('Invalid array format');
      }
    } catch (parseError) {
      console.warn('Failed to parse LLM response:', rawContent, parseError);
      // Fallback parsing: try to extract category from text
      category = 'general';
      translation = null;
      language = 'unknown';
    }

    // Validate category is one of the allowed categories
    const validTopics = [
      'technology', 'business', 'politics', 'entertainment', 'sports',
      'health', 'science', 'finance', 'education', 'travel', 'general'
    ];

    if (!validTopics.includes(category)) {
      console.warn('LLM returned invalid category:', category, 'for query:', query);
      category = 'general'; // Fallback to general
    }

    response.status(200).json({ 
      topic: category,
      translation: translation,
      language: language
    });

  } catch (error) {
    console.error('Error in classifyTopic function:', error);
    response.status(500).json({ error: 'Internal server error.' });
  }
});
