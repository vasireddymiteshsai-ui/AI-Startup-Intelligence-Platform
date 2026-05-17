# 🚀 AI Startup Intelligence Platform (StartupIQ)

**An intelligent startup validation and founder matchmaking platform powered by Google Gemini AI.**

> Validate ideas. Build faster. Find co-founders.

---

## 🎯 Project Overview

**StartupIQ** is a full-stack web application that leverages cutting-edge AI (Google Gemini) to provide entrepreneurs with instant, in-depth analysis of their startup ideas. Beyond simple scoring, the platform offers semantic idea similarity detection, MVP roadmapping, and a community-driven founder matchmaking system.

**Core Problem Solved:** Entrepreneurs need quick, expert validation of their ideas, but professional advisory is expensive and time-consuming. StartupIQ automates comprehensive startup analysis using AI while maintaining human-like insight quality.

---

## ✨ Key Features

### 🧠 **AI-Powered Idea Analysis**
- **Full Validation Report** – Comprehensive analysis including viability, advantages, risks, and success probability
- **Scoring Metrics** – Market demand, monetization potential, execution difficulty, investor appeal, scalability (0-100 scale)
- **Risk Assessment** – Automatic risk classification (Low/Medium/High) based on AI evaluation
- **MVP Roadmap** – Auto-generated MVP feature list, tech stack recommendations, 12-week development timeline, and cost estimates
- **Fallback Intelligence** – Smart local analysis engine when API calls fail (no dead ends)

### 🔍 **Semantic Similarity Detection**
- **Gemini Embeddings** – High-dimensional vector embeddings for startup ideas
- **Cosine Similarity Matching** – Find semantically related ideas even with different wording
- **Related Ideas Discovery** – See what similar founders are building

### 🤝 **Founder Matchmaking & Collaboration**
- **Collaboration Invites** – Send founder invitations based on shared idea domains
- **Role-Based Matching** – Define roles (Founder, Developer, Marketer, Designer, Collaborator)
- **Connection Management** – Build your co-founder network and track active collaborations
- **Invitation System** – Accept/reject collaboration offers from other entrepreneurs

### 📊 **Trend Intelligence**
- **Category-Based Insights** – Spot emerging startup categories (HealthTech, FinTech, AI/ML, etc.)
- **High-Scoring Ideas** – Discover what the community is building and validating
- **Market Pulse** – Real-time trends across different startup domains

### 👥 **User Dashboard & Community**
- **Personal Dashboard** – Stats: total ideas, analyzed count, connections, average score
- **Idea Portfolio** – Submit, track, and manage multiple startup ideas
- **Real-Time Stats** – Live metrics on your startup validation journey
- **Responsive Design** – Seamless experience on desktop, tablet, and mobile

---

## 🛠️ Technology Stack

### **Frontend (JavaScript, HTML, CSS — 100%)**
- **HTML5** – Semantic markup with accessibility best practices
- **CSS3** – Modern grid/flexbox layouts, animations, responsive design
- **Vanilla JavaScript** – DOM manipulation, fetch API, async/await
- **Design System** – Custom CSS variables, glassmorphic UI, gradient accents

### **Backend (Node.js + Express)**
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js | Server-side JavaScript execution |
| **Framework** | Express.js 4.18.2 | RESTful API routing and middleware |
| **AI Integration** | Google Generative AI (Gemini 2.0 Flash) | Startup analysis, embeddings |
| **Database** | Firebase (Firestore) | NoSQL real-time data persistence |
| **Auth** | Firebase Auth + JWT | Secure user authentication |
| **Security** | Helmet.js | HTTP security headers |
| **Rate Limiting** | express-rate-limit | Prevent API abuse |
| **Validation** | express-validator | Input sanitization |
| **Hashing** | bcryptjs 2.4.3 | Password encryption |
| **Utilities** | dotenv, cors | Config management, cross-origin requests |

### **APIs & Services**
- **Google Gemini 2.0 Flash** – Real-time text generation for analysis
- **Google Text Embedding 004** – Semantic vector embeddings
- **Firebase Admin SDK** – Backend Firestore and Auth integration
- **Stripe/Razorpay** – (Optional) Future payment integration

---

## 🏗️ Architecture Overview

### **System Flow**
