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
                const diff = req.body.difficulty || 'medium';
                if (diff === 'easy') hintIndex = Math.min(wordList.length - 1, 499);
                else if (diff === 'hard') hintIndex = Math.min(wordList.length - 1, 1999);
                else hintIndex = Math.min(wordList.length - 1, 999);
            } else {
                const currentIdx = wordList.indexOf(currentBestGuess.toLowerCase().trim());

                if (currentIdx !== -1) {
                    // Found in list. We want an index LOWER than currentIdx (closer to 0).
                    const diff = req.body.difficulty || 'medium';
                    let step = 1; // Default medium (1 step better)

                    if (diff === 'easy') {
                        // Easy: Jump halfway to the top
                        // currentIdx 500 -> 250
                        const listRank = currentIdx + 1;
                        const targetRank = Math.floor(listRank / 2);
                        step = currentIdx - (targetRank - 1);
                        // Simplified: targetIdx = Math.floor(currentIdx / 2)
                    } else if (diff === 'hard') {
                        // Hard: Random step
                        step = Math.max(1, Math.floor(Math.random() * (currentIdx / 2)));
                    } else {
                        // Medium: Just 1 step (next best word)
                        step = 1;
                    }

                    // For 'easy' override logic above to be simpler
                    if (diff === 'easy') {
                        hintIndex = Math.floor(currentIdx / 2);
                    } else if (diff === 'hard') {
                        // Random index between 0 and currentIdx - 1
                        if (currentIdx > 0) {
                            hintIndex = Math.floor(Math.random() * currentIdx);
                        } else {
                            hintIndex = 0; // Already at top
                        }
                    } else {
                        // Medium
                        hintIndex = currentIdx - 1;
                    }

                    // Enforce improvement
                    if (hintIndex >= currentIdx && currentIdx > 0) {
                        hintIndex = currentIdx - 1;
                    }

                    // If we're at index 0 (Rank 2), we can't give a better word from the list!
                    // We must return early to use Gemini fallback or special message?
                    if (hintIndex < 0) {
                        // Fallback to Gemini for a semantic description since we can't give a closer word
                        // Set wordList to empty to force fallback? Or handled below?
                        // hintIndex = -1;
                    }

                } else {
                    // User is not in the list.
                    // Give them the last word to get started.
                    hintIndex = wordList.length - 1;
                }
            }

            // If hintIndex is valid (>=0), return it.
            if (hintIndex >= 0 && hintIndex < wordList.length) {
                const hint = wordList[hintIndex];

                // Double check we are not returning the same word (e.g. prompt override)
                if (hint.toLowerCase() !== (currentBestGuess || '').toLowerCase()) {
                    return res.status(200).json({ hint });
                }
            }
            // If hintIndex < 0 (i.e. User is at #0) or invalid, fall through to Gemini
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
