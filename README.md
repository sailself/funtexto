# Funtexto - Semantic Word Guessing Game

Funtexto is a web-based word guessing game where players try to find a secret target word by guessing related words. The game uses AI embeddings to rank guesses based on their semantic similarity to the target.

## Features

-   **Semantic Similarity**: Uses Google's Gemini Text Embeddings to score words based on meaning, not spelling.
-   **Intelligent Hints**: Uses Gemini 1.5 Flash to provide context-aware hints that bridge the gap to the target word.
-   **Dynamic Difficulty**: Generated "Gold Standard" word lists ensure consistent ranking and reliable progress.
-   **Random Games**: Play the "Daily" word or start a random new game with a unique Game ID.
-   **Multi-language Support**: Interface available in English, Spanish, and Portuguese.
-   **Themes**: Light and Dark mode support.

## Project Structure

-   `src/`: Frontend React application (Game logic, UI components).
-   `api/`: Backend Express/Node.js endpoints.
    -   `guess.js`: Handles embedding calculations and scoring.
    -   `hint.js`: Generates AI hints.
    -   `utils/`: Shared utilities (Logger, Target selection, Word Cache).
-   `logs/`: Server logs (Access and Error logs).
-   `cache/`: Pre-computed word lists for improved performance.

## Setup & Configuration

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root directory (see `.env.example`):
    ```ini
    GOOGLE_API_KEY=your_gemini_api_key
    GEMINI_MODEL=gemini-1.5-flash        # For Chat/Hints
    EMBEDDING_MODEL=text-embedding-004   # For Vector/Embeddings
    ```

## Running the Application

This project runs a backend API (Express) and a frontend Dev Server (Vite) concurrently.

**Start Development Server:**
```bash
npm start
```
-   Frontend: http://localhost:5173
-   Backend API: http://localhost:3000

## Architecture Details

-   **Logging**: Uses `winston` for structured JSON logging and `morgan` for HTTP request tracking. Logs are stored in `logs/combined.log` and `logs/error.log`.
-   **Word Cache**: To improve performance and consistency, the app pre-generates a list of top 500 related words for each target using Gemini 1.5 Flash. These lists are cached in `cache/word_lists/`.
-   **Game State**: Progress is saved to `localStorage`, allowing players to resume games or switch between Daily/Random modes without data loss.
