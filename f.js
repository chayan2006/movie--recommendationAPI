const API_KEY = "6b3122d8"; // OMDb API key

// --- GEMINI API CONFIGURATION ---
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // IMPORTANT: Replace with your actual Gemini API Key
const GEMINI_MODEL = "gemini-1.5-flash-latest"; // Using a recommended model
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
// ---------------------------------

// DOM elements
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const moviesDiv = document.getElementById("movies");
const errorMessage = document.getElementById("error-message");
const loadingIndicator = document.getElementById("loading-indicator");
const container = document.querySelector(".container");
const resetBtn = document.getElementById("reset-btn");
const bgContainer = document.getElementById("bg-animation-container");
const genreSelect = document.getElementById("genre-select");
const typeSelect = document.getElementById("type-select");
const splashScreen = document.getElementById("splash-screen");
const overlay = document.querySelector(".animation-overlay");

// AI Modal DOM elements
const modalBackdrop = document.getElementById('ai-modal-backdrop');
const modalBody = document.getElementById('ai-modal-body');
const modalCloseBtn = document.getElementById('ai-modal-close');
let currentMovieDataForModal = {}; // Holds data for the active modal

// Settings Modal DOM elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModalBackdrop = document.getElementById('settings-modal-backdrop');
const settingsModalCloseBtn = document.getElementById('settings-modal-close');
const bgAnimationToggle = document.getElementById('bg-animation-toggle');
const clearCacheBtn = document.getElementById('clear-cache-btn');

// Login Modal DOM elements
const loginBtn = document.getElementById('login-btn');
const loginModalBackdrop = document.getElementById('login-modal-backdrop');
const loginModalCloseBtn = document.getElementById('login-modal-close');
const loginForm = document.getElementById('login-form');
const guestBtn = document.getElementById('guest-btn');
const loginMessage = document.getElementById('login-message');

// EXPANDED MOVIE LIST FOR ANIMATION COVERAGE
const defaultMovies = ["Inception", "Interstellar", "The Dark Knight", "Parasite", "Joker", "Avengers: Endgame", "Titanic", "The Matrix", "Forrest Gump", "Shutter Island", "Dune", "Blade Runner 2049", "Mad Max: Fury Road", "Léon: The Professional", "Whiplash", "Pulp Fiction", "The Godfather", "Fight Club", "The Lord of the Rings: The Fellowship of the Ring", "Spirited Away", "The Shawshank Redemption", "The Silence of the Lambs", "Saving Private Ryan", "Gladiator", "The Departed", "The Prestige", "Se7en", "Alien", "Terminator 2: Judgment Day", "Back to the Future", "Breaking Bad", "Game of Thrones", "Stranger Things", "The Mandalorian", "The Office", "Peaky Blinders", "Black Mirror"];

let initialMovieData = [];

/**
 * Toggles the visibility of the loading indicator.
 * @param {boolean} show
 */
function setLoading(show) {
    loadingIndicator.classList.toggle("hidden", !show);
    errorMessage.classList.add("hidden");
}

/**
 * Creates the HTML element for a single movie card.
 * @param {Object} movie - The movie data object from OMDb API.
 * @returns {HTMLElement} The constructed div element.
 */
function createMovieCardHTML(movie) {
    const poster = movie.Poster !== "N/A"
        ? movie.Poster
        : 'https://placehold.co/340x460/1f1b24/00f0ff?text=NO+POSTER';

    const fullPlot = movie.Plot || 'Plot summary not available.';
    const rating = movie.imdbRating !== "N/A" ? movie.imdbRating + '/10' : 'N/A';
    const genre = movie.Genre || 'N/A';
    const actors = movie.Actors || 'N/A';

    // Encode data for the modal
    const movieData = {
        title: movie.Title,
        year: movie.Year || 'N/A',
        poster: poster,
        plot: btoa(fullPlot),
        director: btoa(movie.Director || 'N/A'),
        actors: btoa(actors),
        genre: genre,
        rating: rating,
    };

    const trailerSearchQuery = `${movie.Title} ${movie.Year || ''} official trailer`;
    const youtubeLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(trailerSearchQuery)}`;

    const div = document.createElement("div");
    div.className = "movie-card shadow-lg";
    
    // Store all movie data in a single attribute on the assistant button
    div.innerHTML = `
        <h2 class="text-2xl font-bold text-cyan-400 mb-3 drop-shadow-md">${movie.Title} (${movie.Year || 'N/A'})</h2>
        
        <div class="image-container">
             <img src="${poster}" alt="${movie.Title}" onerror="this.onerror=null; this.src='https://placehold.co/340x460/1f1b24/00f0ff?text=NO+POSTER';">
             <div class="plot-overlay">
                <div class="w-full">
                    <p class="text-base font-bold"><strong>📅 Year:</strong> ${movie.Year || 'N/A'}</p>
                    <p class="text-base font-bold"><strong>⭐ Rating:</strong> ${rating}</p>
                    <p class="text-base font-bold"><strong>🎬 Genre:</strong> ${genre}</p>
                    <p class="text-sm italic mt-2">${fullPlot}</p>
                </div>
             </div>
        </div>

        <div class="mt-4 flex flex-col gap-2">
            <a href="${youtubeLink}" target="_blank" class="block w-full text-center bg-red-600 hover:bg-red-700 p-3 rounded-lg text-white font-bold text-base transition">
                ▶️ Watch Trailer
            </a>
            <button class="ai-assistant-btn bg-gradient-to-r from-cyan-500 to-fuchsia-600 p-3 rounded-lg text-white font-bold text-base transition hover:scale-105"
                    data-movie='${JSON.stringify(movieData)}'>
                ✨ AI Movie Assistant
            </button>
        </div>
    `;
    return div;
}


/**
 * Fetches full movie details using the IMDb ID.
 * @param {string} imdbId - The IMDb ID (tt...) of the movie.
 * @returns {Promise<Object|null>} Full movie object or null on error/not found.
 */
async function fetchMovieById(imdbId) {
    try {
        const res = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbId}&plot=full`);
        const data = await res.json();
        return data.Response === "True" ? data : null;
    } catch (e) {
        console.error("Error fetching movie by ID:", e);
        return null;
    }
}

/**
 * Fetches movies based on a query.
 * @param {string} query - Single search term.
 * @returns {Promise<Object[]>} Array of full movie objects.
 */
async function fetchMovies(query) {
    const searchRes = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}`);
    const searchData = await searchRes.json();

    if (searchData.Response === "False" || !searchData.Search) {
        return []; // No results found
    }

    const topResults = searchData.Search.slice(0, 10);
    const detailPromises = topResults.map(item => fetchMovieById(item.imdbID));

    return (await Promise.all(detailPromises)).filter(movie => movie);
}

// --- GEMINI API INTEGRATION FUNCTIONS ---

/**
 * Executes the LLM call with exponential backoff.
 * @param {Object} payload - The Gemini API request payload.
 * @returns {Promise<string>} The generated text.
 */
async function fetchGeminiContent(payload) {
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        attempts++;
        try {
            response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) break;
        } catch (error) {
            console.warn(`Attempt ${attempts} failed, retrying...`);
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 100));
            }
        }
    }
    
    if (!response || !response.ok) {
        throw new Error("Failed to fetch from Gemini API after multiple retries.");
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "🌌 Failed to conjure insight.";
    // Basic Markdown to HTML conversion
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}


// --- Action Animation Helpers ---
function triggerGenreAnimation(genre) {
    overlay.innerHTML = "";
    setTimeout(() => { overlay.innerHTML = ""; }, 4000);

    if (genre.includes("Comedy")) {
        const emojis = ['😂', '🤣', '🥳', '😎', '😜', '🍿'];
        for (let i = 0; i < 15; i++) {
            const confetti = document.createElement("div");
            confetti.className = "comedy-emoji";
            confetti.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            confetti.style.left = `${Math.random() * window.innerWidth}px`;
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;
            overlay.appendChild(confetti);
        }
    } else if (genre.includes("Horror")) {
         for (let i = 0; i < 5; i++) {
            const smoke = document.createElement("div");
            smoke.className = "horror-smoke";
            smoke.style.left = `${Math.random() * window.innerWidth}px`;
            smoke.style.top = `${Math.random() * window.innerHeight}px`;
            smoke.style.animationDelay = `${Math.random() * 0.5}s`;
            overlay.appendChild(smoke);
        }
    }
}


/**
 * Main function to manage display state and render movie results.
 * @param {string|null} query - The search query or null for default display.
 * @param {boolean} isDefault - True if this is the initial or reset display.
 */
async function displayMovies(query, isDefault = false) {
    moviesDiv.innerHTML = "";
    if (!isDefault) setLoading(true);

    const oldResultMsg = document.getElementById("result-message");
    if (oldResultMsg) oldResultMsg.remove();

    // Determine the source of movies: pre-fetched initial data or a new API search
    const sourceMovies = isDefault ? initialMovieData : await fetchMovies(query);
    
    if (!isDefault) setLoading(false);

    // If the search returned no results, show an error.
    if (sourceMovies.length === 0 && !isDefault) {
        errorMessage.classList.remove("hidden");
        return;
    }

    const selectedGenre = genreSelect.value;
    const selectedType = typeSelect.value;
    let renderedCount = 0;

    // Filter the source movies based on the selected genre and type
    const filteredMovies = sourceMovies.filter(movie => {
        const passesGenre = !selectedGenre || (movie.Genre && movie.Genre.includes(selectedGenre));
        const passesType = !selectedType || (movie.Type && movie.Type.toLowerCase() === selectedType.toLowerCase());
        return passesGenre && passesType;
    });

    // For the default view, we only want to show a subset (e.g., first 10) of the filtered results
    const moviesToDisplay = isDefault ? filteredMovies.slice(0, 10) : filteredMovies;

    moviesToDisplay.forEach((movie, index) => {
        const card = createMovieCardHTML(movie);
        card.style.animationDelay = `${index * 0.07}s`; // Stagger the animation
        moviesDiv.appendChild(card);
        renderedCount++;
        if (renderedCount === 1) { // Trigger animation based on first result
             triggerGenreAnimation(movie.Genre || "");
        }
    });

    if (renderedCount === 0) {
        errorMessage.textContent = "No movies or series match the selected criteria. Try resetting the filters.";
        errorMessage.classList.remove("hidden");
    } else if (!isDefault) {
        const resultMsg = document.createElement("p");
        resultMsg.id = "result-message";
        resultMsg.className = "text-xl text-cyan-400 italic tracking-wide mb-12 mt-6";
        resultMsg.textContent = `Showing ${renderedCount} results for "${query}"`;
        container.insertBefore(resultMsg, moviesDiv);
    }
}


/**
 * Populates the background with subtle, floating movie posters.
 */
function animateBackgroundPosters() {
    bgContainer.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: -2;`;
    const moviesForBg = initialMovieData.slice(0, 15);
    moviesForBg.forEach((movie) => {
        if (movie && movie.Poster && movie.Poster !== "N/A") {
            const img = document.createElement("img");
            img.src = movie.Poster;
            img.alt = "";
            img.classList.add('bg-poster');
            img.style.transform = `translate(${Math.random() * 100}vw, ${Math.random() * 100}vh) rotate(${Math.random() * 360}deg)`;
            img.style.animationDuration = `${25 + Math.random() * 15}s`;
            img.style.animationDelay = `${Math.random() * 15}s`;
            bgContainer.appendChild(img);
        }
    });
}

/** Generates a short, synthetic "Tudum" sound effect. */
function playTudumSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        oscillator.frequency.setValueAtTime(80, audioCtx.currentTime);
        oscillator.type = 'sine';
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        const now = audioCtx.currentTime;
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(now + 0.3);
    } catch (e) { console.warn("Audio playback blocked or unsupported:", e); }
}

/** Creates and animates the sequential movie poster reveal. */
function createSequentialPosterAnimation() {
    const postersToShow = initialMovieData.slice(0, 30).filter(m => m && m.Poster !== "N/A");
    postersToShow.forEach((movie, index) => {
        const img = document.createElement('img');
        img.src = movie.Poster;
        img.classList.add('splash-poster');
        img.style.left = `${(index % 6) * 16.66}%`;
        img.style.top = `${Math.floor(index / 6) * 20}%`;
        img.style.animationDelay = `${index * 0.05}s`;
        splashScreen.appendChild(img);
    });
}

/** Fetches all initial data for animations and default display. */
async function fetchInitialData() {
    const detailPromises = defaultMovies.map(title =>
        fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(title)}&plot=full`)
        .then(res => res.json())
        .then(data => data.Response === "True" ? data : null)
        .catch(e => { console.error("Error fetching initial movie:", e); return null; })
    );
    initialMovieData = (await Promise.all(detailPromises)).filter(movie => movie);
}

// --- MODAL FUNCTIONS ---
function openModal(movieData) {
    currentMovieDataForModal = movieData;
    modalBody.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
            <div class="flex-shrink-0">
                <img src="${movieData.poster}" alt="${movieData.title}" class="rounded-lg w-48 mx-auto">
            </div>
            <div>
                <h2 class="text-3xl font-bold text-cyan-400">${movieData.title} (${movieData.year})</h2>
                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button data-task="trivia" class="ai-task-btn bg-white/10 hover:bg-cyan-500/50 p-3 rounded-lg border border-cyan-400 transition">Generate Fun Facts</button>
                    <button data-task="similar" class="ai-task-btn bg-white/10 hover:bg-cyan-500/50 p-3 rounded-lg border border-cyan-400 transition">Suggest Similar Movies</button>
                    <button data-task="ending" class="ai-task-btn bg-white/10 hover:bg-cyan-500/50 p-3 rounded-lg border border-cyan-400 transition">Write Alt. Ending</button>
                    <button data-task="explain" class="ai-task-btn bg-white/10 hover:bg-cyan-500/50 p-3 rounded-lg border border-cyan-400 transition">Explain the Plot</button>
                </div>
                 <div class="mt-4">
                    <textarea id="custom-question-input" class="w-full p-2 rounded-lg bg-slate-800 text-white border border-fuchsia-400/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" placeholder="Or ask your own question..."></textarea>
                    <button data-task="custom" class="ai-task-btn w-full mt-2 bg-fuchsia-600 hover:bg-fuchsia-700 p-3 rounded-lg text-white font-bold text-base transition">Ask AI Assistant 🚀</button>
                </div>
            </div>
        </div>
        <div id="ai-result-area" class="mt-4 p-4 bg-black/30 border border-fuchsia-500/30 rounded-lg min-h-[100px] text-gray-200 shadow-xl">
            Select an option or ask a question to begin...
        </div>
    `;
    modalBackdrop.classList.add('active');
}
function closeModal() {
    modalBackdrop.classList.remove('active');
}
function openSettingsModal() {
    settingsModalBackdrop.classList.add('active');
}
function closeSettingsModal() {
    settingsModalBackdrop.classList.remove('active');
}
function openLoginModal() {
    loginModalBackdrop.classList.add('active');
}
function closeLoginModal() {
    loginModalBackdrop.classList.remove('active');
}

async function handleAIAssistant(task) {
    const resultArea = document.getElementById('ai-result-area');
    resultArea.innerHTML = `<p class="animate-pulse text-cyan-400">Consulting the cosmic archives...</p>`;

    const { title, plot, genre, director, actors } = currentMovieDataForModal;
    const decodedPlot = atob(plot);
    let systemPrompt = "You are a helpful and enthusiastic movie expert AI assistant.";
    let userQuery = "";

    switch (task) {
        case 'trivia':
            userQuery = `Provide 3 interesting and little-known fun facts about the movie "${title}".`;
            break;
        case 'similar':
            userQuery = `Based on the movie "${title}" (a ${genre} film), suggest 5 other movies that fans would likely enjoy. Give a one-sentence reason for each suggestion.`;
            break;
        case 'ending':
            systemPrompt = "You are a creative screenwriter. Write a short, exciting, and dramatically different alternative ending to the provided movie plot. The ending must be a single paragraph.";
            userQuery = `Movie Title: ${title}. Full Plot: ${decodedPlot}. Write an alternative ending now.`;
            break;
        case 'explain':
            userQuery = `Explain the plot of "${title}" in simple, easy-to-understand terms. Here is the full plot summary: ${decodedPlot}`;
            break;
        case 'custom':
            const customQuestion = document.getElementById('custom-question-input').value.trim();
            if (customQuestion.length < 5) {
                resultArea.innerHTML = `<p class="text-red-400">Please type a longer question!</p>`;
                return;
            }
            const persona = atob(director) !== 'N/A' ? atob(director) : atob(actors).split(',')[0].trim();
            systemPrompt = `You are ${persona}, the primary creative force behind the movie "${title}". Answer the user's question in character, using an insightful, enthusiastic, and brief tone.`;
            userQuery = `As ${persona}, answer this question: ${customQuestion}`;
            break;
    }

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const text = await fetchGeminiContent(payload);
        resultArea.innerHTML = text;
    } catch (e) {
        resultArea.innerHTML = `<p class="text-red-400">${e.message}</p>`;
    }
}


// --- Event Listeners and Initial Load ---
window.addEventListener("DOMContentLoaded", async () => {
    await fetchInitialData();
    displayMovies(null, true); 
    animateBackgroundPosters();
    createSequentialPosterAnimation();

    // Display Featured Movie
    const featuredMovieBanner = document.getElementById('featured-movie-banner');
    const today = new Date();
    const featuredMovie = initialMovieData[today.getDate() % initialMovieData.length];
    if(featuredMovie) {
        featuredMovieBanner.innerHTML = `
            <div class="p-4 rounded-xl bg-gradient-to-r from-cyan-900/50 via-slate-800/50 to-fuchsia-900/50 border border-cyan-500/30">
                <h3 class="text-2xl font-bold text-fuchsia-400 font-orbitron">Featured Movie for ${today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
                <p class="text-lg text-gray-200 mt-1">${featuredMovie.Title} (${featuredMovie.Year})</p>
            </div>
        `;
    }
    
    const posterAnimationDuration = 2.0;
    const gRevealDuration = 1.5;
    const finalFadeDuration = 700;
    const lastPosterAnimationEnd = (29 * 0.05 + posterAnimationDuration) * 1000;

    setTimeout(() => {
        document.getElementById('g-shape').style.animation = `g-reveal ${gRevealDuration}s ease-out forwards`;
    }, lastPosterAnimationEnd);
    
    setTimeout(() => {
        playTudumSound();
        splashScreen.style.opacity = '0';
        setTimeout(() => splashScreen.remove(), finalFadeDuration);
    }, lastPosterAnimationEnd + gRevealDuration * 1000);
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (query) {
        displayMovies(query, false);
    }
});

resetBtn.addEventListener("click", () => {
    input.value = "";
    genreSelect.value = "";
    typeSelect.value = "";
    displayMovies(null, true);
});

genreSelect.addEventListener("change", () => displayMovies(input.value.trim() || null, true));
typeSelect.addEventListener("change", () => displayMovies(input.value.trim() || null, true));

// Main delegated click handler
document.body.addEventListener('click', (e) => {
    // AI Assistant Button on Movie Card
    if (e.target.classList.contains('ai-assistant-btn')) {
        const movieData = JSON.parse(e.target.dataset.movie);
        openModal(movieData);
    }
    // Buttons inside the AI Modal
    if (e.target.classList.contains('ai-task-btn')) {
        const task = e.target.dataset.task;
        handleAIAssistant(task);
    }
    // Closing the modals
    if (e.target === modalBackdrop || e.target === modalCloseBtn) {
        closeModal();
    }
    if (e.target === settingsModalBackdrop || e.target === settingsModalCloseBtn) {
        closeSettingsModal();
    }
    if (e.target === loginModalBackdrop || e.target === loginModalCloseBtn || e.target === guestBtn) {
        closeLoginModal();
    }
});

// Smooth scroll for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        
        // Handle nav buttons that open modals
        if (this.id === 'settings-btn') {
            openSettingsModal();
            return;
        }
         if (this.id === 'login-btn') {
            openLoginModal();
            return;
        }
        
        // Handle anchor links for scrolling
        if (targetId && targetId.startsWith('#') && targetId.length > 1) {
             const targetElement = document.querySelector(targetId);
             if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
             }
        } else { // Handle home link
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});

// Functionality for settings controls
bgAnimationToggle.addEventListener('change', () => {
    const displayValue = bgAnimationToggle.checked ? 'block' : 'none';
    document.querySelectorAll('.bg-poster').forEach(poster => poster.style.display = displayValue);
});

clearCacheBtn.addEventListener('click', () => {
    const originalText = clearCacheBtn.textContent;
    clearCacheBtn.textContent = 'Cleared!';
    clearCacheBtn.disabled = true;
    setTimeout(() => {
        clearCacheBtn.textContent = originalText;
        clearCacheBtn.disabled = false;
    }, 2000);
});

// Login Form functionality
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginMessage.textContent = 'Login Successful! Welcome back.';
    loginMessage.classList.remove('text-red-400');
    loginMessage.classList.add('text-green-400');
    
    setTimeout(() => {
        closeLoginModal();
        loginMessage.textContent = ''; // Clear message after closing
    }, 1500);
});