import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'word_lists');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// In-memory map to track ongoing generations
const generationPromises = new Map();

// Ensure we use the Chat/Generation model for creating the list
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

const generateList = async (target, cachePath) => {
    logger.info(`Starting background generation for target: ${target}`);
    try {
        const prompt = `
            Generate a list of 200 single unique words that are semantically related to the word "${target}".
            Sort them by semantic closeness to "${target}" (closest first).
            Do NOT include the word "${target}" itself.
            Do NOT include phrases, only single words.
            Output ONLY the words, separated by commas. No numbering, no extra text.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse words, strictly single words, lowercase
        const words = text.split(/[\n,]+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w && w !== target && !w.includes(' '));

        // Deduplicate and cap
        const uniqueWords = [...new Set(words)];

        // Write to cache
        fs.writeFileSync(cachePath, JSON.stringify(uniqueWords));
        logger.info(`Generated and cached ${uniqueWords.length} words for ${target}`);
    } catch (e) {
        logger.error(`Failed to generate word list for ${target}`, { error: e.message });
    } finally {
        generationPromises.delete(target);
    }
};

export const getWordList = async (target) => {
    const sanitizedTarget = target.toLowerCase().trim();
    const cachePath = path.join(CACHE_DIR, `${sanitizedTarget}.json`);

    // 1. Check File Cache
    if (fs.existsSync(cachePath)) {
        try {
            return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        } catch (e) {
            logger.warn(`Failed to read cache for ${target}, regenerating...`, { error: e.message });
        }
    }

    // 2. Not cached? Trigger background generation if not already running
    if (!generationPromises.has(sanitizedTarget)) {
        logger.info(`Cache miss for ${target}. Triggering background generation.`);
        const promise = generateList(sanitizedTarget, cachePath);
        generationPromises.set(sanitizedTarget, promise);
    }

    // 3. Return null immediately (don't wait)
    return null;
};
