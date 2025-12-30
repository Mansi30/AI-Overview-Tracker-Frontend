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
            content: 'You are a multilingual topic classifier with expert support for Indonesian, Filipino (Tagalog), and Hindi, as well as English and other languages. Classify search queries into exactly one of these categories: technology, business, politics, entertainment, sports, health, science, finance, education, travel, general. Respond with ONLY the category name in English, nothing else. Ensure accurate classification regardless of the input language.'
          },
          {
            role: 'user',
            content: `Classify this search query into one category: "${query}"\n\nCategory:`
          }
        ],
        temperature: 0.1,
        max_tokens: 20
      })
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      console.error('OpenRouter API error:', openrouterResponse.status, errorText);
      response.status(500).json({ error: 'OpenRouter API request failed.' });
      return;
    }

    const data = await openrouterResponse.json();
    const topic = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    // Validate topic is one of the allowed categories
    const validTopics = [
      'technology', 'business', 'politics', 'entertainment', 'sports',
      'health', 'science', 'finance', 'education', 'travel', 'general'
    ];

    if (validTopics.includes(topic)) {
      response.status(200).json({ topic });
    } else {
      console.warn('LLM returned invalid topic:', topic, 'for query:', query);
      response.status(200).json({ topic: 'general' }); // Fallback to general
    }

  } catch (error) {
    console.error('Error in classifyTopic function:', error);
    response.status(500).json({ error: 'Internal server error.' });
  }
});
