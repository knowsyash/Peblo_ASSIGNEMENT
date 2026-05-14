# PebloNotes: Architecture & AI Engineering Process

This document outlines my thought process, architectural decisions, and how I leveraged AI as an engineering tool to build PebloNotes. As a developer, I treat AI not as a code generator, but as a pair-programmer to accelerate boilerplate, brainstorm architecture, and debug complex serverless edge cases.

## System Architecture

**Frontend:** Next.js 14 (App Router), React, TailwindCSS  
**Backend:** Next.js Route Handlers, Vercel Edge Middleware  
**Database:** PostgreSQL (Neon Serverless) via Prisma ORM  
**Authentication:** Custom JWT (JSON Web Tokens) using `jose` and `bcryptjs`  
**AI Integration:** Google Gemini 2.5 Flash API  

### Why this stack?
I chose Next.js App Router because it allows me to heavily utilize React Server Components (RSC) to reduce client-side javascript load. For the database, traditional Postgres struggles with serverless connection pooling, so I specifically chose Neon's serverless Postgres. Custom JWT auth was chosen over heavy libraries like NextAuth to give me fine-grained control over edge middleware routing.

---

## My AI Workflow & Prompts

Here is a look at the actual prompts I wrote to direct the AI during development. My strategy is to dictate the architecture upfront, handle the business logic, and use AI to scaffold the implementation.

### Phase 1: Database & Schema Design
I always start with data modeling. I knew I needed a relational structure that could handle users, notes, and the AI outputs.

**My Prompt:**
> "I am building a fullstack note taking app called PebloNotes. Im using Next.js 14 app router and prisma with neon postgres. Write the prisma schema. I need three models: User, Note, and AISummary. The Note should have a one-to-one relation with AISummary. Also add a shareId to the Note so users can share them publically. make sure to use string uuid for IDs."

### Phase 2: Edge-Compatible Authentication
Building auth for Vercel is tricky because standard Node libraries don't work in Edge middleware. I had to explicitly instruct the AI on which libraries to use to prevent runtime crashes.

**My Prompt:**
> "Let's build the auth system. I dont want to use next-auth, it feels too bloated for this. We will do custom JWT via cookies. Create the signup and login api routes. IMPORTANT: we have to deploy on Vercel, so standard `jsonwebtoken` will crash the edge middleware. You have to use the `jose` library for signing/verifying so it runs on Edge. Also use `bcryptjs` instead of normal `bcrypt` so the C++ bindings dont crash the vercel serverless functions."

### Phase 3: AI Summarization Integration
When connecting to external LLMs, the biggest issue is parsing the output. I engineered the prompt to force strict JSON.

**My Prompt:**
> "Now let's build the `/api/notes/[id]/generate-summary` route. We are integrating Google Gemini. Use the new `gemini-2.5-flash` model because we need fast inference. The frontend expects strict JSON containing 'summary', 'action_items', and 'suggested_title'. Pass `generationConfig: { responseMimeType: 'application/json' }` to the model to enforce JSON mode. wrap the DB updates in a prisma transaction so the note metadata and summary update together."

### Phase 4: UX & State Management
Once the backend was solid, I focused on a seamless, optimistic user interface.

**My Prompt:**
> "For the dashboard notes page, we need a really smooth UX. Let's use Tailwind for a dark glassmorphism theme. The search bar needs to be debounced by 300ms so we dont spam the database. Also, when they type in the editor, implement auto-save using a setTimeout debounce. the UI should show 'Saving...' and 'Saved' states."

### Phase 5: Debugging Deployment Edge Cases
During deployment, I ran into Next.js caching issues with cookies during client-side navigation. 

**My Prompt:**
> "im getting a weird bug on vercel. When I sign up, the cookie is set, but when router.push('/notes') fires, the middleware redirects back to login. I think Next.js is caching the client router state and not sending the new HttpOnly cookie. Change the post-auth redirect to use `window.location.href` to force a hard document reload. also make sure the demo account button auto-provisions the user if they dont exist yet."

---

## Key Takeaways
Building PebloNotes taught me how to navigate the complexities of Serverless/Edge computing. Working with AI accelerates the coding process, but it requires the developer to have a strong fundamental understanding of system architecture, database relations, and deployment environments to actually guide the AI successfully.
