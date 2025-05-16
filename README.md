# Women in STEM Explorer 🚀🔬👩‍🔬

**Secure & Smart Search Portal for Open Data: Women in STEM Edition**

This project is a small-scale, static web application built for a mini-project assignment. It serves as a privacy-conscious search engine interface for exploring and discovering inspiring women in Science, Technology, Engineering, and Mathematics (STEM) from around the world and across different fields and years. The application implements AI-powered search functionality, basic SEO, and core web security practices.

## Project Overview

The goal of this mini-project was to build an application that integrates AI-powered search over publicly available data, focusing on a specific theme. Our theme is "Women in STEM Explorer," utilizing a custom JSON dataset (and potentially Kaggle datasets in the future) to allow users to search for information by country, field, year, or name.

---

## Core Requirements Addressed 🎯

This project fulfills the following core requirements:

**1. Frontend:**
* **Static Site Generator:** Built with **Astro** (`.astro` files for components and pages).
* **UI:** Basic, clean UI with a search bar for queries and a clear results display area.
* **Responsive Design:** The application is designed to be responsive across various screen sizes (achieved via `src/styles/global.css`).
* **Accessibility Focus:** Includes ARIA labels for form controls and semantic HTML for better accessibility.

**2. Search Feature:**
* **AI-Powered Search:** Integrated with the **Google Gemini API** for AI-driven search capabilities when local data doesn't yield results or for more nuanced queries.
* **Structured Query Handling & Semantic Relevance:**
    * Local search allows filtering by specific fields (country, field, year, name).
    * AI search (via Gemini) provides semantic understanding of queries.
* **Dual Search Strategy:**
    * Prioritizes searching a local `output.json` dataset first for speed and offline potential.
    * Falls back to the Gemini API if no local results are found or for broader queries.
* **Pagination:** Implemented for both local search results and AI-generated results to improve user experience with larger datasets.

**3. Security Measures:**
* **HTTPS:** Enforced at the hosting level (standard for modern static site hosting platforms like Netlify, Vercel, GitHub Pages).
* **Content Security Policy (CSP):** A basic CSP is outlined in `src/pages/index.astro` (currently commented, can be activated and configured). It aims to restrict sources for scripts, styles, fonts, and connections.
* **CORS:** Not directly configured as it's a static site, but external APIs (Gemini, Font Awesome) are used with their established CORS policies. Local data is same-origin.
* **Input Sanitization (XSS):**
    * User input (search query) is not directly rendered back as HTML to prevent reflective XSS.
    * Data from the local JSON and AI API is primarily text-based. While basic Markdown from the AI is converted to HTML (bold, italics, lists), the risk is managed by the trusted nature of the AI's typical text output. For broader HTML rendering, a dedicated sanitizer would be recommended.
* **Secure API Keys/Tokens:** The Gemini API key is managed using environment variables (`PUBLIC_GEMINI_API_KEY` in an `.env` file) and passed to the client-side securely during Astro's build process. The key is present in the client-side JS (necessary for client-side API calls) but not hardcoded directly into version control.

**4. SEO Optimization:**
* **Meta Tags:** Includes basic SEO meta tags (`title`, `description`), Open Graph tags (for Facebook/social sharing), and Twitter card tags.
* **Schema.org Markup:** Implemented `WebSite` and `SearchAction` schema for better search engine understanding.
* **Core Web Vitals:** Astro's architecture promotes fast loading times (LCP). Further optimizations like image lazy loading would be considered if more media were added.

**5. Privacy Enhancements:**
* **No User Tracking:** The application does not implement any first-party user tracking, cookies for profiling, or analytics beyond what might be inherent in browser behavior or the external API calls (which are not for tracking *this site's* users).

---

## Technologies Used 🛠️

* **Frontend Framework:** [Astro](https://astro.build/) (Static Site Generator)
* **AI Search API:** [Google Gemini API](https://ai.google.dev/)
* **Styling:** CSS (via `src/styles/global.css`)
* **Icons:** [Font Awesome](https://fontawesome.com/)
* **Local Data:** JSON (`public/output.json`)
* **Version Control:** Git & GitHub
* **Deployment:** (GitHub Pages)

---

## Project Structure 📂

/
├── public/
│   ├── output.json         # Local dataset of women in STEM
│   └── ...                 # Other static assets
├── src/
│   ├── components/         # Astro components (if any)
│   ├── layouts/            # Astro layouts (if any)
│   ├── pages/
│   │   └── index.astro     # Main page of the application
│   ├── scripts/
│   │   └── search.js       # Client-side JavaScript for search and API interaction
│   └── styles/
│       └── global.css      # Global styles for the application
├── .env                    # Environment variables (contains API key - NOT COMMITTED)
├── .gitignore
├── package.json
├── astro.config.mjs
└── README.md


---

## Setup and Running the Project 🚀

**Prerequisites:**
* [Node.js](https://nodejs.org/) (version recommended by Astro, typically latest LTS)
* A package manager like `npm` or `yarn`

**1. Clone the Repository:**
   ```bash
   git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
   cd your-repo-name
2. Install Dependencies:

Bash

npm install
# or
yarn install
3. Set Up Environment Variables:
Create a .env file in the root of the project and add your Google Gemini API key:

Code snippet

PUBLIC_GEMINI_API_KEY=your_actual_gemini_api_key_here
Note: The .env file is included in .gitignore and should not be committed to the repository.

4. Run the Development Server:

Bash

npm run dev
# or
yarn dev
This will start the Astro development server, typically at http://localhost:4321. The site will automatically reload when you make changes to the files.

5. Build for Production:
To create a production-ready build (static files):

Bash

npm run build
# or
yarn build
The output will be in the dist/ directory. You can then deploy this directory to any static hosting service.

6. Preview the Build (Optional):
After building, you can preview the production site locally:
bash npm run preview # or yarn preview

Future Enhancements (Optional) ✨
More sophisticated input sanitization for AI-generated HTML.
Advanced accessibility audits and improvements.
Integration of more datasets or a live API for Women in STEM data.
Implementing the commented-out Content Security Policy.
User accounts or personalized features (though this would move away from the "static/privacy-first" aspect if not handled carefully).
Group Members 🧑‍💻
* @marakiteferi
* @Meti-20
* @thundercode21
* @Kaleb657
* @Lencho123/@Kaneneus(same account)

(This project was created for the Special Topics in CSE mini-project at ASTU.)