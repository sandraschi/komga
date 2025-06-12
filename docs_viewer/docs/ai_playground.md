# AI Playground: Functionality, UI, and Expansion Roadmap

## Overview
The AI Playground is a flexible, extensible environment for experimenting with advanced AI, LLM, RAG, and multimodal features in the docs_viewer project. It is designed for both development and end-user exploration, supporting a wide range of AI-driven workflows.

---

## Running the App on iPhone/iPad

You can use the docs_viewer and AI Playground on iOS devices in several ways:

### 1. **Web App (Recommended/Easiest)**
- Run your backend/frontend on a server (local, LAN, or cloud).
- Access the app via Safari or Chrome on your iPhone/iPad using the server's address (e.g., `192.168.1.100:5174`).
- (Optional) Add to Home Screen in Safari for an app-like experience.

### 2. **Progressive Web App (PWA)**
- Enable PWA support in your React frontend (service workers, manifest).
- Users can "install" the app from Safari/Chrome and use it offline or with notifications.

### 3. **Native iOS App (Capacitor/Cordova/React Native)**
- Wrap your web app in a native shell using [Capacitor](https://capacitorjs.com/), [Cordova](https://cordova.apache.org/), or [React Native WebView](https://reactnative.dev/docs/webview).
- Build and run on your device using Xcode (requires a Mac).
- Can be distributed via TestFlight, App Store, or alternative stores (see below).

### 4. **Remote Access (Cloud/Server)**
- Host your app on a cloud server for access from anywhere.

### 5. **Alternative App Stores & Sideloading (EU)**
- **AltStore:** [altstore.io](https://altstore.io/) allows sideloading apps without the App Store, using a companion app on your computer.
- **Setapp Mobile:** [setapp.com/mobile](https://setapp.com/mobile) is launching as an alternative app store in the EU.
- **EU Digital Markets Act (DMA):** As of 2024, iOS users in the EU can install apps from alternative app stores and sideload apps more easily.
- **Sideloading:** You can install your own `.ipa` files using AltStore, Sideloadly, or Xcode (developer account required).

#### **Summary Table**

| Method         | Setup Difficulty | Native Features | App Store? | Offline? | Notes                        |
|----------------|-----------------|----------------|------------|----------|------------------------------|
| Web App        | ⭐ (Easy)        | No             | No         | No*      | Use Safari/Chrome            |
| PWA            | ⭐⭐              | Limited        | No         | Yes      | Add to Home Screen           |
| Capacitor/Cordova | ⭐⭐⭐         | Yes            | Yes/Alt    | Yes      | Requires Mac/Xcode           |
| React Native   | ⭐⭐⭐⭐            | Yes            | Yes/Alt    | Yes      | Full native, more work       |
| AltStore/Setapp| ⭐⭐⭐             | Yes            | Alt/EU     | Yes      | Sideloading, EU only         |

\*Offline possible with PWA.

---

## Step-by-Step: Running the App on iPhone/iPad

### 1. Web App (Browser)
1. Start your backend/frontend on your PC or server (`npm run dev` or `npm run start`).
2. Find your server's IP address (e.g., `192.168.1.100:5174`).
3. On your iPhone/iPad, connect to the same WiFi network.
4. Open Safari or Chrome and enter the server's address (e.g., `http://192.168.1.100:5174`).
5. (Optional) In Safari, tap the Share icon and choose "Add to Home Screen" for an app-like icon.

### 2. Progressive Web App (PWA)
1. Ensure your React frontend is PWA-enabled (service worker, manifest.json).
2. Build and deploy your frontend (`npm run build`).
3. Access the app in Safari/Chrome as above.
4. Tap "Add to Home Screen" to install the PWA.
5. The app can now work offline and send notifications (if supported).

### 3. Native iOS App (Capacitor)
1. Build your React frontend (`npm run build`).
2. Install Capacitor: `npm install @capacitor/core @capacitor/cli`.
3. Initialize Capacitor: `npx cap init` (follow prompts).
4. Add iOS platform: `npx cap add ios`.
5. Copy your build: `npx cap copy`.
6. Open the iOS project in Xcode: `npx cap open ios`.
7. In Xcode, connect your iPhone/iPad and click the Run button to install.
8. (Optional) Distribute via TestFlight, App Store, or alternative stores (see below).

### 4. AltStore/Sideloading (EU and beyond)
1. Build your app as an `.ipa` file (Xcode: Product > Archive > Distribute App > Ad Hoc or Development).
2. Download and install [AltStore](https://altstore.io/) on your computer and device.
3. Use AltStore to sideload your `.ipa` onto your iPhone/iPad.
4. (EU only) Consider [Setapp Mobile](https://setapp.com/mobile) or other alternative stores for easier distribution.
5. (Advanced) Use Sideloadly or Xcode for direct installation (developer account required).

---

## Current Functionality

### 1. **Tabbed Interface**
- **Setup / Settings:** Configure LLM providers, models, RAG options, Teams integration, and multimodal settings.
- **Single LLM Chat:** Chat with a selected LLM, with support for system prompt/personality selection and RAG (retrieval-augmented generation) context.
- **Dueling LLMs:** Let two (or more) LLMs debate or converse, each with its own personality and RAG context. Useful for comparing models, prompts, and behaviors.
- **Teams Debate:** Simulate (and in the future, connect to real) Microsoft Teams chats, with an LLM as a participant, using RAG for context-aware responses.
- **Talk to Your Future Self:** Inspired by therapeutic interventions (see arXiv:2308.13687), simulate a conversation with your future self (e.g., 40 years ahead), with LLM-driven dialogue.
- **Experiment Log / History:** Save, replay, and export past chat and experiment sessions for analysis or sharing.
- **Multimodal Chat:** Upload a picture or album, analyze and chat with a multimodal LLM (future: RAG over large photo libraries).

### 2. **Backend Capabilities**
- **RAG/Vector DB:**
  - Chunking and embedding of text (markdown, txt, pdf, docx).
  - ChromaDB vector store integration for semantic search and retrieval.
  - Endpoints for embedding, querying, and status.
- **LLM Integration:**
  - Support for multiple providers (Ollama, LM Studio, vLLM, etc.).
  - Model listing, loading, and chat/inference endpoints.
  - System prompt/personality selection and editing.
- **Metadata Management:**
  - Comments, tags, and star ratings stored in SQLite.
  - Calibre integration for book metadata and covers.
- **Robust Error Handling:**
  - Health checks, log viewer, and fallback logic throughout.

### 3. **Frontend Features**
- **Modern React UI:**
  - MUI-based tabbed interface for AI Playground.
  - Personality/system prompt dropdowns and editors.
  - File tree, metadata panel, and search bar.
  - Log viewer and health status display.

---

## Future Expansion Possibilities

### 1. **Real Microsoft Teams Integration**
- **Feasibility:**
  - Bots can join Teams chats, send/receive messages, and act as participants using the Microsoft Graph API and Bot Framework.
  - Requires Azure AD app registration, bot registration, and public endpoint (ngrok for dev).
  - See [BotBuilder-Samples](https://github.com/microsoft/BotBuilder-Samples), [TeamsGPT](https://github.com/robocorp/TeamsGPT), [OpenAI Teams Bot](https://github.com/markostam/OpenAI-Teams-Bot).
- **Challenges:**
  - OAuth2 authentication, permissions, and deployment complexity.
  - Approval required for org-wide deployment.
- **Roadmap:**
  - Scaffold a Teams bot backend, start with echo bot, then add LLM/RAG logic.

### 2. **Multimodal LLMs & Image/Video Generation**
- **Image Upload & Analysis:**
  - Add frontend image/album upload.
  - Backend endpoints for image analysis (e.g., LLaVA, CLIP, BLIP, Gemini, GPT-4o vision, etc.).
- **Photo Library RAG:**
  - Chunk and embed image metadata/captions for semantic search over large photo collections (see iimich for reference).
- **Video Generation (Veo 3):**
  - **Veo 3 is now available to paying Gemini users.**
  - Generates very high quality 8-second video clips with sound and voice.
  - Media coverage is a mix of amazement and trepidation due to the realism and capabilities.
  - **Google is currently ahead of OpenAI in this area:** Veo 3 supports sound and voice, while OpenAI Sora does not (as of June 2024).
  - API access is available to eligible users; integration is possible if you have the necessary API keys.

### 3. **Advanced RAG & Semantic Search**
- **Full-Text RAG:**
  - Index and query entire book collections (e.g., "all books by Dickson Carr").
  - Complex queries: "Which locked room mystery was the most unusual?"
- **Conversation RAG:**
  - Feed the entire evolving conversation (not just last message) into RAG for context-rich debates (dueling LLMs, Teams, future self).

### 4. **Experiment Log & Analytics**
- **Session Storage:**
  - Store, replay, and export chat/experiment sessions.
  - Analyze LLM behavior, compare models, and share results.

### 5. **User-Defined Personalities & Prompts**
- **Custom System Prompts:**
  - Allow users to create, edit, and save their own LLM personalities.

---

## Model/Service Comparison Table

| Model/Service      | Image Gen | Video Gen | Sound/Voice | Local | Cloud API | Public Access | Notes                        |
|--------------------|-----------|-----------|-------------|-------|-----------|---------------|------------------------------|
| Gemini             | ✅        | ❌        | ❌          | ❌    | ✅        | ✅ (API key)   | Image gen via API            |
| Veo 3              | ❌        | ✅        | ✅          | ❌    | ✅        | ✅ (paid)      | 8s video w/ sound, high qual |
| Flow TV            | ❌        | ✅        | ❌          | ❌    | ❌        | ❌            | Research only                |
| Stable Diffusion   | ✅        | (basic)   | ❌          | ✅    | ✅        | ✅            | Open source, local/cloud     |
| Stable Video Diff. | ❌        | ✅        | ❌          | ✅    | ✅        | ✅            | Open source, quality varies  |
| Pika/Runway/Kaiber | ❌        | ✅        | ✅/❌        | ❌    | ✅        | ✅            | Commercial, cloud only       |

---

## References & Further Reading
- [Microsoft Graph API Docs](https://learn.microsoft.com/en-us/graph/teams-concept-overview)
- [Bot Framework Docs](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-overview)
- [TeamsGPT (LLM-powered Teams bot)](https://github.com/robocorp/TeamsGPT)
- [OpenAI Teams Bot Example](https://github.com/markostam/OpenAI-Teams-Bot)
- [arXiv:2308.13687 - "Talking to the Future: Therapeutic LLM Interventions"](https://arxiv.org/abs/2308.13687)
- [iimich - Image/Album RAG](https://github.com/iimich)
- [Veo 3 Announcement](https://veo.google/)

---

## Summary
The AI Playground is a cutting-edge, extensible platform for AI, LLM, RAG, and multimodal experimentation. It supports current workflows and is designed for rapid future expansion—including real Teams integration, multimodal LLMs, and advanced semantic search. Contributions and ideas are welcome!

---

## Most Powerful FOSS Models (June 2025): Text, Image, Video

Keeping up with open-source AI models is challenging due to rapid progress. As of June 2025, here are some of the most powerful and widely used FOSS models:

### Text (LLMs)
- **Llama 3 (Meta):** State-of-the-art open weights, strong reasoning, multilingual, many variants (8B, 70B, 400B+). [Meta AI Llama 3](https://ai.meta.com/llama/)
- **Qwen2 (Alibaba):** Top-tier performance, especially in multilingual and code tasks. [Qwen2 on HuggingFace](https://huggingface.co/Qwen)
- **Mixtral 8x22B (Mistral):** Sparse Mixture-of-Experts, very strong on reasoning and efficiency. [Mistral AI](https://mistral.ai/)
- **Yi-34B/128B (01.AI):** Excellent for reasoning, long context, and multilingual. [Yi on HuggingFace](https://huggingface.co/01-ai)
- **DBRX (Databricks):** Open weights, strong on code and enterprise tasks. [DBRX on HuggingFace](https://huggingface.co/databricks/dbrx)

### Image (Diffusion/Multimodal)
- **Stable Diffusion XL (SDXL):** The most popular open image generator, huge ecosystem. [Stability AI](https://stability.ai/)
- **Kandinsky 3.0:** High-quality, creative, supports text+image input. [Kandinsky on HuggingFace](https://huggingface.co/kandinsky-community)
- **Playground v2/v3:** Fast, high-quality, open weights. [Playground AI](https://playground.com/)
- **LLaVA-Next:** Multimodal LLM (text+image), strong for vision-language tasks. [LLaVA](https://llava.ai/)
- **IDEFICS2:** Multimodal, open weights, strong on image+text reasoning. [IDEFICS2 on HuggingFace](https://huggingface.co/HuggingFaceM4/idefics2)

### Video (Diffusion/Animation)
- **Stable Video Diffusion (SVD, SVD-XT):** Best open video generator, supports short clips. [Stability AI SVD](https://stability.ai/)
- **ModelScope T2V:** Text-to-video, open weights, good for short creative clips. [ModelScope](https://modelscope.cn/models/damo/text-to-video-synthesis)
- **AnimateDiff:** Animation from stills, open source, widely used for creative video. [AnimateDiff](https://github.com/guoyww/AnimateDiff)
- **Pika Labs (open weights):** If released, would be a major open video model (check latest status).

**Note:** The landscape changes monthly. For the latest, check [HuggingFace Leaderboards](https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard) and [Papers with Code](https://paperswithcode.com/).

---

## Research: Using Cursor with Local LLMs via Reverse Proxy (Ollama, LM Studio, etc.)

### Overview

Cursor does not natively support local LLMs (like Ollama, LM Studio, etc.), but the community has developed reverse proxy solutions that let you use local or alternative cloud models in Cursor by "tricking" it into thinking it's talking to OpenAI. The most popular and robust solution is [llm-router](https://github.com/kcolemangt/llm-router), with other alternatives like [ProxyAsLocalModel](https://github.com/Stream29/ProxyAsLocalModel) and [PrivateLLMLens](https://github.com/jimliddle/privatellmlens).

### Main Repo: llm-router
- **Repo:** https://github.com/kcolemangt/llm-router
- **What it does:** Acts as a reverse proxy for OpenAI's API, routing requests to local (Ollama, LM Studio) or cloud (Groq, OpenAI, etc.) LLMs based on model prefix.
- **Key features:**
  - Lets you use local models in Cursor (and other OpenAI-compatible clients)
  - Supports multiple backends (OpenAI, Groq, Ollama, etc.)
  - Model aliases, role rewrites, parameter filtering for compatibility
  - Secure API key management

#### Setup Steps (llm-router)
1. **Clone and configure:**
   - Download from GitHub and create a `config.json` (see sample in repo)
   - Define your backends (Ollama, OpenAI, Groq, etc.) and model aliases
2. **Run llm-router:**
   - Start the proxy server (prebuilt binaries or build from source)
   - Set your API keys as environment variables or in a `.env` file
3. **Expose to Cursor:**
   - Use [ngrok](https://ngrok.com/) or similar to create a public HTTPS endpoint (Cursor requires HTTPS)
   - Copy the ngrok URL
4. **Configure Cursor:**
   - In Cursor settings, paste the llm-router API key as the "OpenAI API Key"
   - Set the ngrok URL as the "Override OpenAI Base URL"
   - Enable only the models you have configured in llm-router
   - Save and verify
5. **Use model prefixes:**
   - In Cursor, select models like `ollama/llama3`, `openai/gpt-4o`, `groq/deepseek` as defined in your config

#### Advantages
- Use powerful local models (no token cost, privacy, speed)
- Seamless switching between local and cloud LLMs
- Full control over which models are available
- Can leverage advanced prompting/role features

#### Drawbacks
- Requires running a local proxy and (optionally) ngrok
- Cursor's "Verify" button may fail if you have models enabled that aren't available in your config
- Some features (e.g., streaming, advanced OpenAI params) may not be fully supported by all backends
- Occasional breakage if Cursor changes its API expectations

#### Community/Media Reaction
- **Highly popular** among power users and open-source AI enthusiasts
- [llm-router GitHub issue](https://github.com/getcursor/cursor/issues/1380) has dozens of upvotes and active discussion
- Mentioned in AI/LLM Discords, Reddit, and Twitter/X as a "must-have" for local LLM workflows
- No major media coverage, but strong grassroots adoption

### Alternative Approaches
- [ProxyAsLocalModel](https://github.com/Stream29/ProxyAsLocalModel):
  - Proxies remote LLM APIs as LM Studio/Ollama endpoints, works for JetBrains AI Assistant and similar tools
  - Written in Kotlin, supports OpenAI, Claude, Qwen, Gemini, Deepseek, Mistral, SiliconFlow, etc.
  - Hot-reloadable config, cross-platform
- [PrivateLLMLens](https://github.com/jimliddle/privatellmlens):
  - Zero-server web interface for Ollama, supports vision models and file attachments
  - Useful for local testing and experimentation, not a proxy for Cursor but good for local LLM UI
- [streamlit-ollama-llm](https://github.com/romilandc/streamlit-ollama-llm):
  - Streamlit UI for local Ollama models, not a proxy but a nice local chat interface

### Tips & Notes
- Always check the latest README and issues for breaking changes or new features
- If you have trouble with HTTPS, try different tunneling solutions (ngrok, Cloudflare Tunnel, etc.)
- For best results, only enable models in Cursor that are available in your llm-router config
- Some users report success with LM Studio's built-in OpenAI proxy, but llm-router is more flexible

---

## Cursor Cloud LLM Billing, API Keys, and When to Use Your Own

### How Cursor Billing Works
- **Your $20/month Cursor Pro subscription covers all built-in cloud LLM calls** (OpenAI, Groq, etc.).
- **You do NOT get extra bills** from OpenAI, Groq, or other LLM providers unless you enter your own API key in Cursor's settings.
- **Every AI request (codegen, chat, etc.) counts against your Cursor quota** (e.g., 500/month), regardless of which LLM is used (cloud or local via proxy).

### When Would You Get Extra Bills?
- **Only if you enter your own API key** (for OpenAI, Groq, etc.) in Cursor's settings. In that case, you pay both Cursor and the LLM provider.
- **If you use only built-in models or local LLMs via proxy, you never get a surprise bill.**

### Why Use Your Own API Key?
- **Access to the newest or specialized models** (e.g., GPT-4o, Claude 3 Opus, Gemini 1.5 Pro) before Cursor adds them.
- **Custom providers** (OpenRouter, Together, Perplexity, your own hosted LLM, etc.).
- **Higher quotas or lower latency** (if you have a paid LLM account with better limits).
- **Experimentation/research** (prompt engineering, advanced features, private endpoints).
- **Enterprise/compliance** (all LLM calls must go through your own API key).

### Should Most Users Do This?
- **No!** For most users, using Cursor's built-in models is best—no extra cost, no hassle.
- **Only use your own API key if you have a specific advanced need.**

#### Summary Table
| How you use Cursor         | Cursor $20/mo covers LLM? | Extra bill from OpenAI/Groq? |
|---------------------------|:-------------------------:|:----------------------------:|
| Built-in models (default) | Yes                      | No                           |
| Your own API key entered  | No                       | Yes (billed by provider)     |
| Local LLM via proxy       | Yes (Cursor quota only)  | No                           |

---

## Hot New Coding LLMs (June 2025)

Here are some of the most sensational, just-released coding LLMs as of June 2025:

- **Deepseek Coder V2** ([GitHub](https://github.com/deepseek-ai/DeepSeek-Coder))
  - State-of-the-art open-source code LLM, 100B+ parameters, outperforms GPT-4 Turbo on many code tasks. Supports multi-language, long context, and advanced reasoning.
- **CodeQwen2** ([HuggingFace](https://huggingface.co/Qwen/CodeQwen2-72B-Instruct))
  - Alibaba's new code-specialized LLM, top-tier on HumanEval and MBPP, strong in Python, Java, C++, and more.
- **CodeLlama 70B V2** ([Meta AI](https://ai.meta.com/research/models/llama-3/))
  - Meta's latest code model, improved reasoning, better context handling, and open weights.
- **Mixtral 8x22B Coder** ([Mistral AI](https://mistral.ai/news/mixtral-8x22b/))
  - Sparse Mixture-of-Experts, very strong on code generation and completion, open weights.
- **SiliconFlow GLM-4 Code** ([SiliconFlow](https://huggingface.co/SiliconFlow/GLM-4-32B-0414))
  - New Chinese/English code LLM, competitive with GPT-4 Turbo on code tasks.

**Note:** The landscape changes fast—check HuggingFace, OpenRouter, and LLM leaderboards for the latest releases!

---

## Using Cutting-Edge Coding LLMs Locally with Cursor

By running the latest champion coding LLMs (such as Deepseek Coder V2, CodeQwen2, CodeLlama 70B V2, Mixtral 8x22B Coder, or whatever new model arrives next week) locally via Ollama or LM Studio, and connecting them to Cursor through a reverse proxy (like llm-router), you can:

- Access the very best, most up-to-date coding models as soon as they're released—often **before Cursor adds them to its built-in lineup**.
- Combine Cursor's powerful AI coding/editor features with the flexibility and privacy of local LLMs.
- Experiment with new models, compare performance, and stay at the cutting edge of AI coding.

**This is a highly recommended workflow for advanced users and researchers who want the latest and greatest models.** The open-source LLM landscape changes weekly—keep an eye on HuggingFace, OpenRouter, and LLM leaderboards for new releases!

---

## Why Reverse Proxy Matters: The Reality of Coding LLM Providers

It's important to note that Cursor, Windsurf, Rocode, Cline, and similar tools are **not in the business of training new coding LLMs from scratch**—this typically requires a 50,000+ GPU server farm and resources only available to the largest AI labs and tech giants. Instead, these platforms focus on integrating and providing access to the best open-source or commercial models as soon as they're available.

- **Windsurf's SWE-1** may be a rare exception, as they are reportedly training their own model, but this is not the norm.
- For everyone else, the most practical way to use the latest and greatest coding LLMs is to run them locally (via Ollama, LM Studio, etc.) and connect them to your editor (Cursor, Windsurf, etc.) through a reverse proxy (like llm-router).

**This workflow is the standard for all but the largest AI labs.** It lets you benefit from the rapid progress in open-source and commercial LLMs without waiting for your favorite editor to add official support.

---

## LLM Provider Policies and External Model Access (Anthropic, Google, Grok, etc.)

Another wrinkle in the LLM landscape is that some providers—like Anthropic—may refuse to be natively integrated into third-party editors (e.g., Windsurf's "stable" of LLMs). However, you can still use these models "externally" by providing your own API key. As of June 2025:

- **Windsurf** allows users to connect to Anthropic (Claude) via API key, even though it's not a built-in model. This is currently the only external LLM supported in Windsurf.
- **Cursor** does not have a similar mechanism for external LLM integration; you are limited to the built-in models or those you proxy locally.

It's also plausible that major players like **Google** and **Grok (xAI)** will keep their very best LLMs for their own exclusive use, especially for internal products and services. While they have not (yet) focused on agentic AI coding assistants, this could change as the market evolves.

**Bottom line:** The ability to use external LLMs via API key is rare and may become more important as providers restrict access to their top models. For now, reverse proxying and local hosting remain the most flexible options for advanced users.

--- 