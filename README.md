# VoxAI - Futuristic Text-to-Speech

VoxAI is a premium, AI-powered text-to-speech platform designed with a futuristic glassmorphism UI. It offers advanced voice controls, neural high-fidelity audio generation, and unique character personas, with a special focus on high-quality Indian Hindi accents.

![VoxAI Preview](https://picsum.photos/seed/voxai/1200/630)

## 🚀 Features

- **Neural HQ Studio**: High-fidelity audio generation powered by Gemini's `gemini-2.5-flash-preview-tts` model.
- **Character Personas**: 10+ pre-defined character voices (Farmer, Old Man, Child, Dadi, Bollywood Star, etc.) with automatic pitch and rate mapping.
- **Indian Hindi Support**: Specialized Hindi (India) language and accent optimization for natural-sounding speech.
- **Real-time Synthesis**: Instant playback using the Web Speech API with granular controls for pitch, rate, and volume.
- **Voice Recording**: Capture and download your speech sessions as high-quality `.webm` or `.wav` files.
- **Futuristic UI**: A sleek, responsive interface with neon accents, glassmorphism, and smooth animations powered by `motion/react`.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Animations**: `motion/react`
- **Icons**: `lucide-react`
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Backend**: Express.js (for serving static files and API proxying)

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/voxai.git
   cd voxai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 📖 Usage

1. **Enter Text**: Type or paste your content into the main text area.
2. **Select Voice**: Choose from available system voices or use the **Neural HQ Studio** for premium quality.
3. **Pick a Persona**: Use the **Character Personas** panel to instantly apply unique voice styles like "Dadi" or "Bollywood Star".
4. **Fine-tune**: Adjust the pitch, rate, and volume sliders for custom results.
5. **Generate & Download**: Click **Speak** to listen, or use **Export .WAV** in the Neural Studio for high-fidelity downloads.

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- UI inspiration from futuristic HUD designs
- Powered by Google Gemini AI
