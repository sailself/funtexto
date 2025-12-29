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
                // No guess yet? Defaults based on difficulty
                // Easy: Rank 500
                // Medium: Rank 1000
                // Hard: Rank 2000
                const diff = req.body.difficulty || 'medium';
                if (diff === 'easy') hintIndex = Math.min(wordList.length - 1, 499);
                else if (diff === 'hard') hintIndex = Math.min(wordList.length - 1, 1999);
                else hintIndex = Math.min(wordList.length - 1, 999);
            } else {
                const currentIdx = wordList.indexOf(currentBestGuess.toLowerCase().trim());
                // currentIdx is 0-based index. Rank = currentIdx + 1.

                if (currentIdx !== -1) {
                    const currentRank = currentIdx + 1;
                    const diff = req.body.difficulty || 'medium';
                    let targetRank;

                    if (diff === 'easy') {
                        // Easy: Half the rank (e.g. 500 -> 250)
                        targetRank = Math.max(1, Math.floor(currentRank / 2));
                    } else if (diff === 'medium') {
                        // Medium: Rank - 1 (e.g. 500 -> 499)
                        targetRank = Math.max(1, currentRank - 1);
                    } else {
                        // Hard: Random rank better than current
                        // Random between 1 and currentRank - 1
                        if (currentRank <= 1) targetRank = 1;
                        else targetRank = Math.floor(Math.random() * (currentRank - 1)) + 1;
                    }

                    hintIndex = targetRank - 1; // back to 0-based index
                } else {
                    // User is not in the list (Rank > 500). 
                    // Bring them into the list at the bottom or based on difficulty?
                    // Let's just give them the last word in our list (usually top 5000) 
                    // to get them Started.
                    hintIndex = wordList.length - 1;
                }
            }

            // Safety check
            if (hintIndex < 0) hintIndex = 0;
            if (hintIndex >= wordList.length) hintIndex = wordList.length - 1;

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
