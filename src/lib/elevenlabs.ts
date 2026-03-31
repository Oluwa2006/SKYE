const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export type VoiceEntry = {
  id: string;
  name: string;
  description: string;
  language: "en" | "hi";
};

// English voices — food/brand/ad narration
const ENGLISH_VOICES: VoiceEntry[] = [
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",     description: "Deep & authoritative", language: "en" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",     description: "Young & hype",         language: "en" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",    description: "Warm & inviting",      language: "en" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",     description: "Bold & expressive",    language: "en" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",   description: "Clear & professional", language: "en" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte",description: "Friendly & upbeat",   language: "en" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",    description: "Confident & modern",  language: "en" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",   description: "Smooth & persuasive", language: "en" },
];

// Hindi voices from ElevenLabs voice library
// To get IDs: elevenlabs.io/app/voices > Explore > filter Hindi > click ... on each voice > "Copy Voice ID"
const HINDI_VOICES: VoiceEntry[] = [
  { id: "mttGjNqgkgo5cciwsyoc",   name: "Dhurv",   description: "Deep & intimate",      language: "hi" },
  { id: "RXe6OFmxoC0nlSWpuCDy",   name: "Anika",   description: "Polished & soothing",  language: "hi" },
  { id: "WeK8ylKjTV2trMlayizC", name: "Srikant", description: "Friendly & clear",     language: "hi" },
  { id: "QO2wwSVI9F7DwU5uUXDX", name: "Shivank", description: "Firm & warm",          language: "hi" },
  { id: "8baRIHZEGj62eS9YHzC6",   name: "Neha P",  description: "Natural & expressive", language: "hi" },
  { id: "F8IvasoAdpDhOjLm5YBm",   name: "Viraj",   description: "Deep & suspenseful",   language: "hi" },
];

export const VOICES: VoiceEntry[] = [...ENGLISH_VOICES, ...HINDI_VOICES];

export function getVoicesForLanguage(langCode: string): VoiceEntry[] {
  if (langCode === "hi") return HINDI_VOICES;
  return ENGLISH_VOICES;
}

export const DEFAULT_VOICE_ID = ENGLISH_VOICES[0].id; // Adam

export const LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "sv", label: "Swedish" },
  { code: "id", label: "Indonesian" },
  { code: "fil", label: "Filipino" },
  { code: "ro", label: "Romanian" },
  { code: "uk", label: "Ukrainian" },
  { code: "el", label: "Greek" },
  { code: "ta", label: "Tamil" },
];

export const DEFAULT_LANGUAGE_CODE = "en";

export async function generateSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
  languageCode: string = DEFAULT_LANGUAGE_CODE
): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        language_code: languageCode,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
