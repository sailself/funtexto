import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './utils/logger.js';
import { getTarget } from './utils/target.js';
import { getWordList } from './utils/wordCache.js';

// Initialize GenAI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const primaryModelName = process.env.EMBEDDING_MODEL;
const fallbackModelName = "text-embedding-004";

// Cache for target embeddings to save API calls
const embeddingCache = new Map();

async function getEmbedding(text) {
    if (embeddingCache.has(text)) return embeddingCache.get(text);

    // Helper to try specific model
    const tryEmbed = async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent(text);
        return result.embedding.values;
    };

    try {
        const modelToUse = primaryModelName || fallbackModelName;
        const embedding = await tryEmbed(modelToUse);

        if (embeddingCache.size > 1000) embeddingCache.clear();
        embeddingCache.set(text, embedding);
        return embedding;
    } catch (e) {
        // Fallback if we tried a custom model and it wasn't the fallback one
        if (primaryModelName && primaryModelName !== fallbackModelName) {
            logger.warn(`Primary embedding model '${primaryModelName}' failed. Falling back to '${fallbackModelName}'.`, { error: e.message });
            try {
                const embedding = await tryEmbed(fallbackModelName);
                if (embeddingCache.size > 1000) embeddingCache.clear();
                embeddingCache.set(text, embedding);
                return embedding;
            } catch (fallbackError) {
                logger.error("Fallback embedding also failed:", { error: fallbackError.message });
                throw e; // Throw original error for clarity usually, or fallback error
            }
        }
        logger.error("Embedding Error:", { error: e.message });
        throw e;
    }
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Rank Calculation for fallback (embedding)
// These get added to the list length (e.g. 500 + calculatedRank)
function calculateRank(similarity) {
    if (similarity >= 0.999) return 1;
    const k = 17;
    const rank = Math.exp(k * (1 - similarity));
    return Math.floor(rank);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { guess, secretOverride, gameId } = req.body;

    if (!guess) {
        return res.status(400).json({ error: 'Guess is required' });
    }

    if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration: No API Key' });
    }

    const target = secretOverride || getTarget(gameId);

    try {
        const guessNorm = guess.trim().toLowerCase();
        const targetNorm = target.trim().toLowerCase();

        if (guessNorm === targetNorm) {
            return res.status(200).json({ rank: 1, similarity: 1, word: guessNorm });
        }

        // 1. Check Pre-computed Word List
        const wordList = await getWordList(targetNorm);
        const listIndex = wordList.indexOf(guessNorm);

        if (listIndex !== -1) {
            // Found in list! Rank is index + 2 (because #1 is target, which isn't in list usually, but let's say Top 1 in list is Rank 2)
            // Wait, "rank 1" is the target. So list[0] is Rank 2.
            const rank = listIndex + 2;
            // Fake similarity for display: 1.0 (target) -> 0.6 (rank 1000). Linear map.
            // Let's say Rank 2 is 0.99, Rank 500 is 0.5?
            const similarity = Math.max(0.4, 0.99 - (listIndex * 0.001));

            return res.status(200).json({
                rank,
                similarity,
                word: guessNorm,
                cached: true
            });
        }

        // 2. Fallback to Embeddings
        const [vecTarget, vecGuess] = await Promise.all([
            getEmbedding(targetNorm),
            getEmbedding(guessNorm)
        ]);

        const similarity = cosineSimilarity(vecTarget, vecGuess);
        const baseRank = calculateRank(similarity);

        // Ensure rank is always greater than the list size (e.g. > 500)
        // If list has 500 words, last rank is 501.
        // So fallback starts at 502.
        const listSize = wordList.length || 500;
        const rank = baseRank + listSize + 1;

        return res.status(200).json({
            rank,
            similarity,
            word: guessNorm,
            cached: false
        });

    } catch (error) {
        logger.error('Guess processing failed', { error: error.message });
        return res.status(500).json({
            error: 'Failed to process guess',
            details: error.message
        });
    }
}
