import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './utils/logger.js';
import { getTarget } from './utils/target.js';
import { getWordList } from './utils/wordCache.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { secretOverride, currentBestGuess, gameId } = req.body || {};
    const target = secretOverride || getTarget(gameId);

    if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration: No API Key' });
    }

    try {
        // 1. Try to get a hint from the Cached Word List
        const wordList = await getWordList(target);

        if (wordList && wordList.length > 0) {
            let hintIndex = -1;

            if (!currentBestGuess) {
                // No guess yet? Give a middle-ground hint, not too easy, not too hard.
                // Say Rank 200 (index 198)
                hintIndex = Math.min(wordList.length - 1, 198);
            } else {
                const currentIdx = wordList.indexOf(currentBestGuess.toLowerCase().trim());
                if (currentIdx !== -1) {
                    // User is in the list. Give them a better word (improve rank by ~10%)
                    const improvement = Math.ceil(currentIdx * 0.1) + 1; // at least 1 step
                    hintIndex = Math.max(0, currentIdx - improvement);
                } else {
                    // User is not in the list (Rank > 500). Bring them into the list.
                    // Give the last word in the list (Rank 500)
                    hintIndex = wordList.length - 1;
                }
            }

            // Only give a hint if it's different from current best (it should be)
            const hint = wordList[hintIndex];
            return res.status(200).json({ hint });
        }

        // 2. Fallback: Ask Gemini for a hint (if cache failed)
        // Ask Gemini for a hint
        const condition = currentBestGuess
            ? `My best guess so far is "${currentBestGuess}". Give me a word that is semantically closer to "${target}" than "${currentBestGuess}".`
            : `Give me a helpful word that is semantically related to "${target}".`;

        const prompt = `
            The secret word is "${target}".
            I am playing a game where I need to guess the word based on semantic similarity.
            ${condition}
            It should NOT be a direct synonym or the word itself.
            Output ONLY the single word. No punctuation, no explanation.
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        // Remove quotes or periods if model adds them
        text = text.replace(/["'.]/g, '');

        // Ensure we don't return the target itself (fallback)
        if (text.toLowerCase() === target.toLowerCase()) {
            return res.status(200).json({ hint: "sun" }); // reliable fallback
        }

        return res.status(200).json({ hint: text });

    } catch (error) {
        logger.error('Hint generation error:', { error: error.message });
        return res.status(500).json({ error: 'Failed to generate hint' });
    }
}
