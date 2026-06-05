# 🤖 JARVIS Mobile AI

> *Just A Rather Very Intelligent System* — Assistente de IA pessoal estilo Iron Man

![JARVIS](https://img.shields.io/badge/JARVIS-AI%20Assistant-00d4ff?style=for-the-badge&logo=openai&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)

Interface futurista com tema HUD neon azul, reconhecimento de voz, respostas faladas e memória persistente via Supabase.

---

## ✨ Funcionalidades

- 🧠 **Chat IA** — Powered by Google Gemini 1.5 Flash
- 🎤 **Voz** — Reconhecimento com Web Speech API + resposta falada
- 💾 **Memória** — Persistência no Supabase
- 📱 **PWA** — Instala no Android/iOS/Desktop como app nativo
- 🌐 **Offline** — Service Worker com cache básico
- 🎨 **HUD Futurista** — Tema azul neon estilo Iron Man

---

## 🗂 Estrutura

```
/
├── index.html         # Interface principal
├── style.css          # Estilos HUD futurista
├── script.js          # Lógica: Gemini + Supabase + Voz + PWA
├── manifest.json      # Manifesto PWA
├── sw.js              # Service Worker
├── config.example.js  # Template de configuração
├── config.js          # ⚠️ Suas chaves (NÃO commitar)
├── .gitignore
├── assets/
│   ├── icon.png       # Ícone do app (512x512)
│   └── logo.png       # Logo opcional
└── README.md
```

---

## 🚀 Configuração Passo a Passo

### 1️⃣ Obter Chave do Gemini

1. Acesse **https://aistudio.google.com/app/apikey**
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie a chave (começa com `AIza...`)

> A API do Gemini tem um generoso plano gratuito (15 RPM / 1M tokens/dia no momento da publicação).

---

### 2️⃣ Criar Projeto no Supabase

1. Acesse **https://supabase.com** e crie uma conta gratuita
2. Clique em **"New Project"**
3. Escolha um nome, senha e região
4. Após criado, vá em **Project Settings → API**
5. Copie:
   - **Project URL** → `https://xxx.supabase.co`
   - **anon public** key → `eyJ...`

#### Criar tabela de memórias

No Supabase, abra o **SQL Editor** e execute:

```sql
-- Criar tabela de memórias do JARVIS
CREATE TABLE jarvis_memories (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL DEFAULT 'default',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE jarvis_memories ENABLE ROW LEVEL SECURITY;

-- Policy: qualquer um pode ler/escrever (ajuste para produção)
CREATE POLICY "allow_all" ON jarvis_memories
  FOR ALL USING (true) WITH CHECK (true);
```

---

### 3️⃣ Configurar o Projeto

**Opção A — Via interface do app** *(recomendado)*

Abra o JARVIS, clique no ícone ⚙ (Configurações) e preencha:
- Gemini API Key
- Supabase URL
- Supabase Anon Key
- Nome do usuário

As chaves ficam salvas no `localStorage` do navegador.

**Opção B — Via arquivo config.js**

```bash
cp config.example.js config.js
```

Edite `config.js`:

```js
var GEMINI_API_KEY   = 'AIza...';
var SUPABASE_URL     = 'https://xxx.supabase.co';
var SUPABASE_ANON_KEY = 'eyJ...';
```

> ⚠️ Certifique-se que `config.js` está no `.gitignore`!

---

### 4️⃣ Publicar no GitHub Pages

1. Crie um repositório no GitHub (pode ser privado)
2. Faça push dos arquivos:

```bash
git init
git add .
git commit -m "feat: JARVIS Mobile AI inicial"
git branch -M main
git remote add origin https://github.com/SEU_USER/jarvis-ai.git
git push -u origin main
```

3. No GitHub, vá em **Settings → Pages**
4. Em **Source**, selecione `Deploy from a branch`
5. Branch: `main`, pasta: `/ (root)`
6. Clique **Save**

Em alguns minutos seu JARVIS estará em:
`https://SEU_USER.github.io/jarvis-ai/`

> ⚠️ Se usar `config.js` com chaves hardcoded, **não use em repositório público**.  
> Prefira configurar via interface do app.

---

### 5️⃣ Instalar no Android

1. Abra o link do GitHub Pages no **Chrome para Android**
2. Aguarde carregar completamente
3. Toque no banner **"Instalar JARVIS"** que aparece automaticamente
   - Ou: menu (⋮) → **"Adicionar à tela inicial"**
4. Confirme a instalação
5. O ícone do JARVIS aparecerá na sua tela inicial!

> Funciona também no iOS via Safari: **Compartilhar → Adicionar à Tela de Início**

---

### 6️⃣ Instalar no Desktop (Chrome/Edge)

1. Abra o site no Chrome ou Edge
2. Na barra de endereços, clique no ícone de **instalar** (💻)
3. Ou: menu → **"Instalar JARVIS Mobile AI"**

---

## 🔐 Segurança

| Prática | Status |
|---------|--------|
| Chaves não expostas no código-fonte | ✅ Via localStorage ou config.js local |
| config.js no .gitignore | ✅ |
| HTTPS obrigatório para PWA | ✅ GitHub Pages usa HTTPS |
| Supabase Row Level Security | ✅ Habilitado |
| Sem backend próprio exposto | ✅ Chamadas diretas às APIs |

> **Nota**: Em apps de produção com múltiplos usuários, implemente autenticação no Supabase e restrinja as políticas RLS por `auth.uid()`.

---

## 🛠 Tecnologias

| Tech | Uso |
|------|-----|
| HTML5 / CSS3 / JS puro | Interface completa sem frameworks |
| Google Gemini 1.5 Flash | Motor de IA via REST API |
| Web Speech API | Reconhecimento e síntese de voz |
| Supabase | Banco de dados PostgreSQL (memórias) |
| PWA + Service Worker | Instalação + cache offline |
| GitHub Pages | Hospedagem gratuita com HTTPS |

---

## 🎨 Personalização

### Mudar cor principal
Em `style.css`, edite as variáveis CSS:
```css
:root {
  --neon-blue: #00d4ff;  /* cor principal */
  --neon-cyan: #00ffea;  /* cor secundária */
}
```

### Mudar personalidade do JARVIS
Em `script.js`, edite `SYSTEM_PROMPT`:
```js
const SYSTEM_PROMPT = `Você é JARVIS...`;
```

### Ícones
Substitua os arquivos em `assets/`:
- `icon.png` — 512×512px, fundo transparente ou escuro

---

## 📋 Requisitos do Navegador

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Speech API (mic) | ✅ | ⚠️ Limitado | ✅ iOS 16+ | ✅ |
| SpeechSynthesis (TTS) | ✅ | ✅ | ✅ | ✅ |
| PWA / Service Worker | ✅ | ✅ | ✅ | ✅ |
| Gemini API fetch | ✅ | ✅ | ✅ | ✅ |

> Para melhor experiência de voz, use **Google Chrome**.

---

## 🐞 Problemas Comuns

**"Chave Gemini não configurada"**  
→ Configure via ⚙ Configurações ou crie `config.js`

**Microfone não funciona**  
→ O site precisa estar em HTTPS. Localhost também funciona.

**Supabase não salva memórias**  
→ Verifique se criou a tabela `jarvis_memories` e as policies

**App não aparece para instalar**  
→ O manifesto só funciona em HTTPS. Teste pelo GitHub Pages.

---

## 📄 Licença

MIT — Livre para uso pessoal e comercial.

---

*"Bem-vindo ao futuro, senhor."* — JARVIS
