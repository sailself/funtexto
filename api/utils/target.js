import { readFileSync } from 'fs';
import { join } from 'path';

// Read targets.json synchronously
const targetsPath = join(process.cwd(), 'api', 'targets.json');
const targets = JSON.parse(readFileSync(targetsPath, 'utf8'));

export const getDailyWord = () => {
    // START_DATE = Jan 1, 2024
    const startDate = new Date('2024-01-01').getTime();
    const today = new Date().getTime();
    const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const index = daysDiff % targets.length;
    return targets[index];
};

export const getTarget = (gameId) => {
    if (gameId) {
        // Simple hash or modulus to map ID to word
        // Ensure gameId is treated as an integer
        const id = parseInt(gameId, 10);
        if (!isNaN(id)) {
            const index = Math.abs(id) % targets.length;
            return targets[index];
        }
    }
    return getDailyWord();
};
