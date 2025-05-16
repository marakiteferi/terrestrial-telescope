// Access the API key from the global window object
const clientApiKey = window.clientApiKey;

console.log('[search.js] Script loaded. Checking clientApiKey at top level:',
    typeof clientApiKey !== 'undefined' && clientApiKey ? `Exists (first 5 chars: ${clientApiKey.substring(0,5)}...)` : '!!! clientApiKey NOT DEFINED or empty at top level !!!'
);

document.addEventListener('DOMContentLoaded', () => {
    console.log('[search.js] DOMContentLoaded. Checking clientApiKey:',
        typeof clientApiKey !== 'undefined' && clientApiKey ? `Exists (first 5 chars: ${clientApiKey.substring(0,5)}...)` : '!!! clientApiKey NOT DEFINED or empty in DOMContentLoaded !!!'
    );

    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const resultsHeaderDiv = document.getElementById('results-header');
    const paginationControlsDiv = document.getElementById('pagination-controls');

    let localDataCache = null;
    let currentPagedItems = []; // Generic store for items to be paginated (local or API)
    let currentPaginationSource = ''; // To track if pagination is for 'local' or 'api'
    let currentPage = 1;
    const resultsPerPage = 3;
    const placeholderText = '<p class="placeholder-text">Enter a query to search for inspiring women in STEM.</p>';
    if (resultsDiv) resultsDiv.innerHTML = placeholderText;

    // --- 1. Function to load local JSON data ---
    async function loadLocalData() {
        if (localDataCache) {
            return localDataCache;
        }
        try {
            const response = await fetch('/output.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching output.json`);
            }
            const rawText = await response.text();
            let cleanedText = rawText.trim();
            let jsonData;

            try {
                jsonData = JSON.parse(cleanedText);
            } catch (parseError) {
                console.warn("Initial JSON.parse failed. Attempting to clean common issues...", parseError.message);
                if (cleanedText.endsWith(',')) {
                    cleanedText = cleanedText.slice(0, -1);
                }
                if (!cleanedText.startsWith('[')) {
                    if (cleanedText.startsWith('{') && cleanedText.endsWith('}')) {
                        cleanedText = `[${cleanedText}]`;
                    }
                }
                cleanedText = cleanedText.replace(/,\s*$/, "");
                if (!cleanedText.startsWith("[")) {
                    cleanedText = `[${cleanedText}]`;
                } else if (cleanedText.startsWith("[") && cleanedText.endsWith(",")) {
                    cleanedText = cleanedText.slice(0, -1) + "]";
                }
                try {
                    jsonData = JSON.parse(cleanedText);
                } catch (finalParseError) {
                    console.error("Could not parse local JSON data (output.json) after cleaning attempts:", finalParseError);
                    console.error("Problematic JSON text (first 500 chars):", rawText.substring(0, 500));
                    throw finalParseError;
                }
            }

            if (!Array.isArray(jsonData)) {
                if (typeof jsonData === 'object' && jsonData !== null) {
                    console.warn("Local data (output.json) parsed as an object, not an array. Wrapping it in an array.");
                    localDataCache = [jsonData];
                } else {
                    console.error("Local data (output.json) is not an array and not a single object after parsing. Search will be affected.");
                    if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = '';
                    if(resultsDiv) resultsDiv.innerHTML = '<p class="error-message"><i class="fas fa-exclamation-triangle"></i> Error: Local dataset is not in the expected array format.</p>';
                    return [];
                }
            } else {
                localDataCache = jsonData;
            }
            return localDataCache;
        } catch (error) {
            console.error('Could not load or parse local JSON data (output.json):', error);
            if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = '';
            if(resultsDiv) resultsDiv.innerHTML = `<p class="error-message"><i class="fas fa-exclamation-triangle"></i> Could not load local dataset: ${error.message}. Ensure output.json exists in the public folder and is valid JSON.</p>`;
            return [];
        }
    }

    if (typeof loadLocalData === "function") {
        loadLocalData().then(data => {
            if (data && data.length > 0) {
                console.log(`Successfully loaded ${data.length} records from output.json`);
            } else if (resultsDiv && !resultsDiv.querySelector('.error-message')) {
                console.warn("Local data (output.json) is empty or could not be loaded properly.");
            }
        }).catch(err => console.error("Error pre-loading local data:", err));
    }

    // --- 2. Function to search local data ---
    function searchLocalData(data, query) {
        const q = query.toLowerCase().trim();
        if (!data || !Array.isArray(data) || data.length === 0) return [];
        return data.filter(item => {
            if (!item || typeof item !== 'object') return false;
            for (const key in item) {
                if (Object.prototype.hasOwnProperty.call(item, key)) {
                    if (String(item[key]).toLowerCase().includes(q)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    // --- 3. Function to display results (handles both local and API now with pagination) ---
    function displayResults(items, source = "local") {
        if(resultsDiv) resultsDiv.innerHTML = '';
        if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = '';
        if(paginationControlsDiv) paginationControlsDiv.innerHTML = '';
        currentPagedItems = []; // Reset paged items

        if (!items || items.length === 0) {
            let message = '<p class="placeholder-text">No results found for your query.</p>';
            if (source === "api_fallback_no_results") {
                message = `<p class="placeholder-text">No results found in our local data or from the AI search.</p>`;
            } else if (source === "local_no_results_will_try_api") {
                return;
            }
            if(resultsDiv) resultsDiv.innerHTML = message;
            return;
        }

        currentPage = 1; // Reset to first page for new results
        currentPaginationSource = source; // Set the source for pagination

        if (source === "local") {
            if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = `<h2><i class="fas fa-database"></i> Local Dataset Results</h2>`;
            currentPagedItems = items; // All local results are now candidates for pagination
            renderCurrentPage();
            setupPagination();
        } else if (source === "api") {
            if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = `<h2><i class="fas fa-robot"></i> AI Generated Insights</h2>`;
            const rawApiResponse = items[0];

            if (!rawApiResponse || rawApiResponse.toLowerCase().includes("no specific information found") || rawApiResponse.toLowerCase().includes("returned no text or empty response")) {
                if(resultsDiv) resultsDiv.innerHTML = `<p class="placeholder-text">The AI could not find specific information for this query.</p>`;
                return;
            }
            // Process API response into displayable blocks
            currentPagedItems = rawApiResponse
                .split(/\n\s*\n+/)
                .map(block => block.trim())
                .filter(block => block.length > 0)
                .flatMap(block => {
                    if (block.match(/^\s*([\-\*\•]|\d+\.)\s+/m)) {
                        const subItems = block.split('\n').map(line => line.trim()).filter(line => line.match(/^\s*([\-\*\•]|\d+\.)\s+/));
                        if (subItems.length > 1) return subItems;
                    }
                    return [block];
                });

            if (currentPagedItems.length === 0) {
                if(resultsDiv) resultsDiv.innerHTML = `<p class="placeholder-text">AI response processed, but no displayable content found.</p>`;
                return;
            }
            renderCurrentPage();
            setupPagination();
        }
    }

    // --- Helper function to render a single local item ---
    function formatLocalItemToHtml(item) {
        let html = '<div class="result-item local-result-item">';
        let title = item["Name"] || item["STEM Fields"] || item["Country"] || "Result";
        let yearInfo = item["Year"] ? ` (${item["Year"]})` : "";
        html += `<h3>${title}${yearInfo}</h3>`;
        for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key) && item[key]) {
                if (key !== "Name" && key !== "STEM Fields" && key !== "Country" && key !== "Year" || !title || String(item[key]).length < 25) { // Show short values always
                     html += `<p><strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${item[key]}</p>`;
                } else if (key === "STEM Fields" && title !== item["STEM Fields"]) {
                     html += `<p><strong>STEM Fields:</strong> ${item[key]}</p>`;
                } else if (key === "Country" && title !== item["Country"]) {
                     html += `<p><strong>Country:</strong> ${item[key]}</p>`;
                } else if (key === "Description" || key === "Key achievements or contributions") { // Ensure long descriptions are shown
                    html += `<p><strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${item[key]}</p>`;
                }
            }
        }
        html += '</div>';
        return html;
    }

    // --- Helper function to format a single AI content block ---
    function formatAiContentToHtml(contentBlock) {
        let htmlContent = contentBlock;
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');

        if (htmlContent.match(/^\s*[\-\*\•]\s+/)) {
            return `<li>${htmlContent.replace(/^\s*[\-\*\•]\s+/, '')}</li>`;
        }
        if (htmlContent.match(/^\s*\d+\.\s+/)) {
            return `<li>${htmlContent.replace(/^\s*\d+\.\s+/, '')}</li>`;
        }
        return `<p>${htmlContent}</p>`;
    }

    // --- Generic function to render the current page's items ---
    function renderCurrentPage() {
        if(!resultsDiv || !currentPagedItems || currentPagedItems.length === 0) {
            if(resultsDiv) resultsDiv.innerHTML = placeholderText; // Fallback if no items
            return;
        }
        resultsDiv.innerHTML = ''; // Clear previous page content

        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const pageItemsToRender = currentPagedItems.slice(startIndex, endIndex);

        let pageHtml = '';
        if (currentPaginationSource === 'local') {
            pageItemsToRender.forEach(item => {
                pageHtml += formatLocalItemToHtml(item);
            });
            resultsDiv.innerHTML = `<div class="local-results-container">${pageHtml}</div>`;
        } else if (currentPaginationSource === 'api') {
            let isInsideUl = false;
            let isInsideOl = false;
            pageItemsToRender.forEach(block => {
                const formattedBlock = formatAiContentToHtml(block);
                if (formattedBlock.startsWith('<li>')) {
                    const isOrderedItem = block.match(/^\s*\d+\.\s+/);
                    if (isOrderedItem) {
                        if (isInsideUl) { pageHtml += '</ul>'; isInsideUl = false; }
                        if (!isInsideOl) { pageHtml += '<ol>'; isInsideOl = true; }
                    } else {
                        if (isInsideOl) { pageHtml += '</ol>'; isInsideOl = false; }
                        if (!isInsideUl) { pageHtml += '<ul>'; isInsideUl = true; }
                    }
                    pageHtml += formattedBlock;
                } else {
                    if (isInsideUl) { pageHtml += '</ul>'; isInsideUl = false; }
                    if (isInsideOl) { pageHtml += '</ol>'; isInsideOl = false; }
                    pageHtml += formattedBlock;
                }
            });
            if (isInsideUl) pageHtml += '</ul>';
            if (isInsideOl) pageHtml += '</ol>';
            resultsDiv.innerHTML = `<div class="ai-result">${pageHtml}</div>`;
        }
        // Update results header with count for current source
        if (resultsHeaderDiv) {
            const totalResults = currentPagedItems.length;
            if (currentPaginationSource === 'local') {
                 resultsHeaderDiv.innerHTML = `<h2><i class="fas fa-database"></i> Local Dataset Results (${totalResults})</h2>`;
            } else if (currentPaginationSource === 'api') {
                 resultsHeaderDiv.innerHTML = `<h2><i class="fas fa-robot"></i> AI Generated Insights (Page ${currentPage} of ${Math.ceil(totalResults / resultsPerPage)})</h2>`;
            }
        }
    }

    // --- Generic pagination setup ---
    function setupPagination() {
        if(!paginationControlsDiv || !currentPagedItems || currentPagedItems.length === 0) {
            if (paginationControlsDiv) paginationControlsDiv.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(currentPagedItems.length / resultsPerPage);

        if (totalPages <= 1) {
            paginationControlsDiv.innerHTML = '';
            return;
        }

        let buttonsHtml = '';
        buttonsHtml += `<button class="pagination-button prev-button" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page"><i class="fas fa-arrow-left"></i> Previous</button>`;
        buttonsHtml += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
        buttonsHtml += `<button class="pagination-button next-button" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">Next <i class="fas fa-arrow-right"></i></button>`;
        paginationControlsDiv.innerHTML = buttonsHtml;

        const prevButton = paginationControlsDiv.querySelector('.prev-button');
        if (prevButton && !prevButton.disabled) {
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderCurrentPage(); // Re-render based on currentPaginationSource
                    setupPagination();   // Update button states and page number
                }
            });
        }

        const nextButton = paginationControlsDiv.querySelector('.next-button');
        if (nextButton && !nextButton.disabled) {
            nextButton.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderCurrentPage(); // Re-render based on currentPaginationSource
                    setupPagination();   // Update button states and page number
                }
            });
        }
    }

    // --- 4. Function to search with Gemini API ---
    async function searchWithGeminiAPI(query) {
        console.log('[search.js] searchWithGeminiAPI called. Using clientApiKey (first 5 chars):',
            clientApiKey ? clientApiKey.substring(0,5) + '...' : '!!! clientApiKey IS UNDEFINED/EMPTY in searchWithGeminiAPI !!!'
        );

        if (typeof clientApiKey === 'undefined' || !clientApiKey) {
            console.error("API Key (clientApiKey) is missing or undefined. Cannot proceed with AI search.");
            if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = '';
            if(resultsDiv) {
                const loadingMsgElement = resultsDiv.querySelector('.loading-message.contd') || resultsDiv.querySelector('.loading-message');
                if (loadingMsgElement) loadingMsgElement.remove();
                resultsDiv.innerHTML = '<p class="error-message" data-type="api-key-error"><i class="fas fa-key"></i> API key not configured. AI search unavailable.</p>';
            }
            if(paginationControlsDiv) paginationControlsDiv.innerHTML = '';
            return null;
        }

        if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = `<h2><i class="fas fa-robot"></i> AI Generated Insights</h2>`;
        if(resultsDiv) {
            const loadingMsgElement = resultsDiv.querySelector('.loading-message.contd');
            if (loadingMsgElement) loadingMsgElement.remove();
            const noLocalResultsMsg = resultsDiv.querySelector('.placeholder-text');
            if (noLocalResultsMsg && noLocalResultsMsg.textContent.includes("No results found in local data")) noLocalResultsMsg.remove();
            resultsDiv.innerHTML = '<p class="loading-message"><i class="fas fa-spinner fa-spin"></i> Searching with AI (Gemini)... Please wait.</p>';
        }
        if(paginationControlsDiv) paginationControlsDiv.innerHTML = '';

        const modelName = 'gemini-1.5-flash-latest';
        const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${clientApiKey}`;

        try {
            const response = await fetch(apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a helpful assistant for the "Women in STEM Explorer" website.
                            Your audience is looking for information about women in Science, Technology, Engineering, and Mathematics.
                            Based on the query: "${query}", provide concise and informative details.
                            Focus on: Name, Key achievements or contributions, Field(s) of work, Country of origin or significant work, Important years or period of activity.
                            If providing a list of individuals, use clear bullet points (e.g., starting lines with '- ' or '* ', or numbered like '1. ') for each person or distinct point. Each item in a list should be on a new line.
                            If the query is general, provide relevant statistics, trends, or notable examples.
                            If you cannot find specific information, clearly state that. Do not invent information.
                            Format your response for easy readability on a webpage. Use paragraphs for descriptive text and bullet/numbered lists for multiple items.
                            Avoid overly long paragraphs. Ensure each distinct piece of information or individual is clearly separated.
                            Example for a list:
                            - Name: Ada Lovelace
                              Field: Mathematics, Computing
                              Contribution: First computer programmer.
                              Country: UK
                              Period: 1815-1852

                            - Name: Marie Curie
                              Field: Physics, Chemistry
                              Contribution: Pioneer in radioactivity.
                              Country: Poland, France
                              Period: 1867-1934`
                        }]
                    }],
                    "generationConfig": { "temperature": 0.7, "topK": 1, "topP": 1, "maxOutputTokens": 2048 },
                    "safetySettings": [
                      { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                      { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                      { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                      { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
                    ]
                })
            });

            if (!response.ok) {
                const errorBodyText = await response.text();
                let errorData;
                try { errorData = JSON.parse(errorBodyText); }
                catch (e) { errorData = { error: { message: errorBodyText || `HTTP ${response.status} - ${response.statusText}` } }; }
                console.error('Gemini API Error Response Status:', response.status, 'Body:', errorData);
                if (errorData.error?.message && (errorData.error.message.includes("API key not valid") || errorData.error.message.includes("API_KEY_INVALID"))) {
                    throw new Error(`Gemini API Key Error: ${errorData.error.message}. Please check your API key.`);
                }
                throw new Error(`Gemini API Error: ${response.status}. ${errorData.error?.message || 'Unknown error from API.'}`);
            }

            const data = await response.json();

            if (data.promptFeedback && data.promptFeedback.blockReason) {
                const blockReason = data.promptFeedback.blockReason;
                const safetyRatingsInfo = data.promptFeedback.safetyRatings?.map(r => `${r.category.replace('HARM_CATEGORY_', '')}: ${r.probability}`).join(', ') || 'N/A';
                console.warn(`Gemini API request blocked: ${blockReason}. Safety: ${safetyRatingsInfo}`);
                if(resultsDiv) resultsDiv.innerHTML = `<p class="error-message"><i class="fas fa-shield-alt"></i> AI search blocked (Reason: ${blockReason}). Try rephrasing. [Details: ${safetyRatingsInfo}]</p>`;
                return null;
            }

            if (data.candidates?.[0]?.finishReason && data.candidates[0].finishReason !== "STOP" && data.candidates[0].finishReason !== "MAX_TOKENS") {
                console.warn('Gemini API did not finish normally:', data.candidates[0].finishReason);
                if(resultsDiv && !resultsDiv.querySelector('.error-message')) {
                     resultsDiv.innerHTML += `<p class="warning-message"><i class="fas fa-exclamation-circle"></i> AI search ended unexpectedly: ${data.candidates[0].finishReason}. Info might be incomplete.</p>`;
                }
            }

            const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiResponseText && aiResponseText.trim() !== "") {
                return aiResponseText;
            } else {
                console.log("Gemini API returned no text/empty response. Full response:", data);
                if (data.candidates?.[0]?.finishReason === "SAFETY") {
                     return `The AI's response was filtered due to safety concerns. Try a different query.`;
                }
                return 'The AI returned no specific information for this query.';
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = '';
            if(resultsDiv) {
                 let errorMessage = `<p class="error-message"><i class="fas fa-server"></i> Error during AI search: ${error.message}</p>`;
                 if (error.message && error.message.toLowerCase().includes("api key")) {
                     errorMessage = `<p class="error-message"><i class="fas fa-key"></i> AI Search Error: Issue with API key configuration. ${error.message}</p>`;
                 }
                 resultsDiv.innerHTML = errorMessage;
            }
            if(paginationControlsDiv) paginationControlsDiv.innerHTML = '';
            return null;
        }
    }

    // --- 5. Event Listener for Search Button and Enter Key ---
    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = '';
            if(resultsDiv) resultsDiv.innerHTML = placeholderText;
            if(paginationControlsDiv) paginationControlsDiv.innerHTML = '';
            return;
        }

        if(resultsHeaderDiv) resultsHeaderDiv.innerHTML = '';
        if(resultsDiv) resultsDiv.innerHTML = '<p class="loading-message"><i class="fas fa-spinner fa-spin"></i> Searching local data...</p>';
        if(paginationControlsDiv) paginationControlsDiv.innerHTML = '';
        currentPagedItems = [];

        const localJsonData = await loadLocalData();
        let localResults = [];

        if (Array.isArray(localJsonData) && localJsonData.length > 0) {
            localResults = searchLocalData(localJsonData, query);
        }

        if (localResults.length > 0) {
            displayResults(localResults, "local"); // This will now handle pagination for local results
        } else {
            if (resultsDiv) {
                if (resultsDiv.querySelector('.loading-message') || resultsDiv.querySelector('.error-message')) {
                     resultsDiv.innerHTML = '<p class="placeholder-text">No results found in local data.</p>';
                }
                resultsDiv.innerHTML += '<p class="loading-message contd"><i class="fas fa-wifi"></i> Trying AI search...</p>';
            }

            if (typeof clientApiKey === 'undefined' || !clientApiKey) {
                console.error("CRITICAL CHECK FAILED: API Key is missing before calling searchWithGeminiAPI.");
                // Error message handled by searchWithGeminiAPI or the check within it.
                await searchWithGeminiAPI(query); // Let it handle its own API key error display
                return;
            }

            const apiResponse = await searchWithGeminiAPI(query);
            if (apiResponse) {
                displayResults([apiResponse], "api"); // API response is a single string, wrapped in an array for displayResults
            } else {
                const loadingMsgElement = resultsDiv.querySelector('.loading-message.contd');
                if (resultsDiv && loadingMsgElement) {
                    loadingMsgElement.remove();
                    if (localResults.length === 0 && !resultsDiv.querySelector('.error-message')) {
                        displayResults([], "api_fallback_no_results");
                    } else if (!resultsDiv.querySelector('.error-message')){
                        resultsDiv.innerHTML += '<p class="placeholder-text">AI search did not yield specific results or encountered an issue.</p>';
                    }
                }
            }
        }
    }

    if (searchButton && searchInput && resultsDiv && resultsHeaderDiv && paginationControlsDiv) {
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
            }
        });
    } else {
        console.error('Critical UI elements missing. Search functionality impaired.');
        if (document.body) {
            const errorNotice = document.createElement('p');
            errorNotice.innerHTML = '<i class="fas fa-bug"></i> Page did not initialize correctly. Critical UI elements for search are missing.';
            // Basic styling for visibility
            errorNotice.style.color = 'red'; errorNotice.style.fontWeight = 'bold'; errorNotice.style.textAlign = 'center'; errorNotice.style.padding = '20px';
            if (resultsDiv) { resultsDiv.appendChild(errorNotice); } else { document.body.insertBefore(errorNotice, document.body.firstChild); }
        }
    }
});