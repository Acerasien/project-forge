# Forge (AI-Native Engineering Platform)

Forge is an autonomous, agentic software engineering assistant designed to model, design, and validate software systems. Rather than operating as a simple chat interface or a basic code editor, Forge is built on the principle: **"Artifacts are the source of truth; chat is a presentation layer."**

Forge guides you through a traceable, structured engineering pipeline:
```
     Vision (Scope & Feasibility)
                ↓
     Requirements Engineering (User Stories, System Specifications)
                ↓
     Architecture Engineering (High-level Design, ADRs, Component & Deployment Design)
                ↓
     System Design & Code Generation (Future Milestones)
```

Each stage consumes approved artifacts, records immutable execution provenance, establishes relationships in a directed acyclic graph (DAG), and validates consistency.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v20+ recommended)
- **pnpm** (preferred package manager)
- **SQLite3** (for local data persistence)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Acerasien/project-forge.git
cd project-forge
pnpm install
```

### Run in Development
Start the hot-reloading development server for both the Electron main and React renderer processes:
```bash
pnpm dev
```

### Packaging & Distribution
To package Forge into a native standalone installer for your platform:
```bash
# Build for Windows
pnpm build:win

# Build for macOS
pnpm build:mac

# Build for Linux
pnpm build:linux
```

---

## ⚙️ AI Provider Setup

Forge is provider-agnostic and abstracts all LLM interactions through its `AIPort`. You can configure local or cloud models:

1. **Cloud Providers:** OpenAI (GPT-4o) or Google Gemini (Gemini 1.5 Pro/Flash).
2. **Local Providers:** Ollama or LM Studio.
3. **Setup Credentials:** In the Forge Settings panel, select your provider and input your API keys or local host endpoints (credentials are securely saved using keytar/OS Keychain).

---

## 🛠️ How to Use Forge

### 1. Create an Initiative
An **Initiative** is your engineering workspace. It represents a product, a feature migration, or a repository that you want to design.

### 2. Run the Requirements Engineering Pack
- **Generate Requirements:** Forge analyzes your initial Vision draft to produce formal requirements.
- **Generate User Stories:** Breaks down the approved requirements into discrete user stories.
- **Produce Implementation Plan:** Outlines the sequence of work.
- **Approval Gate:** Once you approve the Requirements, they transition from `Draft` to `Approved`.

### 3. Run the Architecture Engineering Pack
*Note: This capability enforces **Domain-Enforced Approval Gates**—it will reject design generation if requirements are not approved.*
- **System Architecture:** Forge transforms approved requirements into structural design artifacts.
- **Architecture Decision Records (ADRs):** Documents major design choices and trade-offs.
- **Component & Deployment Design:** Details runtime boundaries and deployment topology.
- **Validation Engine:** Run the architecture validator to audit tracing gaps, orphaned requirements, and cyclic dependencies. Validation produces decoupled, immutable `Finding` reports instead of modifying your designs directly.

---

## 📊 Visualizing the System

### Traceability Graph
Forge maintains a strict directed acyclic graph of your decisions (using `GraphService` under the hood). Inside the app, navigate to the **Graph Tool** (built on React Flow) to visualize how code components trace back to architectural decisions, which trace back to ADRs, requirements, and your original vision.

### Codebase Graph (Graphify)
We utilize **Graphify** to index our own codebase. To regenerate or view the codebase structure of Forge itself:
```bash
# Re-extract code files and update the index
graphify update .

# Visualize the graph
# Open graphify-out/graph.html in your browser
```

---

## 🏗️ Architecture & Codebase Layout

Forge strictly follows **Hexagonal Clean Architecture** patterns:
```
docs/                       # Comprehensive system documentation & ADRs
src/
├── domain/                 # Core domain entities (Artifact, Finding, ADR), rules, and contracts
├── application/            # Use cases (InitiativeManager, ArtifactEngine, GraphService)
│   └── capabilities/       # Cohesive capability packs (Requirements, Architecture)
├── infrastructure/         # Adapters (SQLite storage, OpenAI/Gemini providers)
├── main/                   # Electron main process entry & IPC handlers
└── renderer/               # Presentation layer (React, TailwindCSS, CodeMirror 6, React Flow)
```
For deep architectural details, see the [`/docs/`](docs/README.md) directory.
