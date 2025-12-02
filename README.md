# BEFORE INSTALLING ANYTHING

Install conda, python=3.11
Install nvm, version 24.9.0

Backend lives on https://0.0.0.0:8000
Frontend lives on https://localhost:3000

# 🧠 Healthbot Frontend

> Internal frontend repo for the Healthbot AI chat interface.

Built with **Next.js 16**, **Tailwind v4**, and **Clerk** for authentication.  
Backend lives at: `https://hcss.cs.purdue.edu/healthChatbot-backend`

---

## ⚙️ Quick Setup

```bash
git clone <repo-url>
cd healthbot-frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

Runs at: `http://localhost:3000`

---

## 🌍 Environment Variables

```env
# Backend
NEXT_PUBLIC_BACKEND_URL=https://hcss.cs.purdue.edu/healthChatbot-backend
# alt (local)
# NEXT_PUBLIC_BACKEND_URL=http://44.211.226.67:3009

# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="YOUR_PUBLISHABLE_KEY"
CLERK_SECRET_KEY="YOUR_SECRET_KEY"
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# Forge key (internal)
FORGE_KEY="FORGE_KEY"
```

---

## 🧩 Main Features

- 🔐 **Auth** — sign-in/sign-up with Clerk  
- 💬 **Chat** — persistent threads, pin/delete/search  
- ⚙️ **Settings** — customize what Healthbot calls you + bot traits  
- 🧭 **Sidebar** — keyboard shortcuts, categories (Today, 7 days, Older)  
- 💾 **Persistence** — localStorage for chats + messages  
- 🧱 **Protected routes** — `/chat/*`, `/settings/*`

---

## 📂 Key Paths

```
app/
├── chat/              # chat UI
│   ├── components/    # ChatItem, CategorySection, Sidebar, etc.
│   └── [id]/          # individual chat view
├── settings/          # user preferences + logout
lib/
│   ├── chatStore.ts   # localStorage chat/message mgmt
│   ├── api.ts         # backend routes
│   └── types.ts
hooks/
│   ├── useChat.ts     # handles messages + streaming
│   └── useKeyboardShortcut.ts
middleware.ts          # route protection
```

---

## 🧠 Dev Notes

- Run `npm dev` — no backend needed if `NEXT_PUBLIC_BACKEND_URL` is set  
- Avoid setting state inside unguarded `useEffect`  
- Use `~/` alias for imports  
- Tailwind v4 used for styling  
- Keyboard shortcuts:
  - **Ctrl/Cmd + J** → toggle sidebar  
  - **Ctrl/Cmd + K** → new chat  
  - **Ctrl/Cmd + /** → search  
  - **Ctrl/Cmd + .** → focus input  

---

## 🧹 Common Tasks

- **Delete chat:** also clears messages from `localStorage`
- **Env change:** update `.env.local` for new backend
- **Settings:** stored under `t3_chat_preferences`
- **Protected route fix:** handled in `middleware.ts`

---

## 🧑💻 Team Reminders

- Repo is **frontend-only**
- All API calls hit the backend URL above
- Don’t expose Clerk secret key publicly
- Preferences + chat data stay client-side (localStorage)

---

**Maintainer:** Internal AI/Frontend Team  
**Last Updated:** Nov 2025