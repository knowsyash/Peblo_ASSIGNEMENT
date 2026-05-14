# PebloNotes

PebloNotes is a sophisticated, full-stack collaborative AI note-taking workspace designed for ultimate productivity. It features a modern, responsive two-column interface with real-time auto-saving, deep AI integration for smart summarizations, and a secure public sharing system. The application seamlessly fuses rapid local interaction with resilient backend synchronization.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | App Router, Server Components, API Routes |
| **React** | Interactive UI state, Debounced Hooks |
| **TypeScript** | End-to-end type safety |
| **Tailwind CSS** | Styling, pure CSS charts, and responsive layout |
| **Prisma ORM** | Database schema and query management |
| **PostgreSQL** | Relational data persistence |
| **Google Gemini** | AI content summarization and action items |
| **jose** | Secure Edge-compatible JWT authentication |

## Local Setup

Follow these steps to get PebloNotes running on your local machine:

1. **Clone the repository** (or navigate to your working directory):
   ```bash
   git clone <your-repo-url>
   cd peblo-notes
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env
   ```
   Ensure you provide a valid `DATABASE_URL` for PostgreSQL, a secure `JWT_SECRET`, and an active `LLM_API_KEY` for Anthropic.

4. **Initialize the Database**:
   Push the Prisma schema to your PostgreSQL instance:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## How to Run

Once setup is complete, start the development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

## AI Integration

PebloNotes harnesses the power of Google's Gemini API to elevate your note-taking experience. Within the notes editor, you can access the "AI Assistant" panel to instantly generate:
- **Concise Summaries**: A 2-3 sentence overview of your note's contents.
- **Action Items**: A cleanly formatted checklist of tasks extracted from the text.
- **Suggested Titles**: Smart title recommendations that can be applied to your note with a single click.

All AI calls are securely handled entirely server-side using the Google Generative AI SDK, protecting your API keys and utilizing the generous free tier for personal projects.

## Screenshots

*(Placeholder for future screenshots showing the Dashboard, Notes Workspace, and AI Panel)*
