const { GoogleGenAI, Type } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

async function run() {
  const pid = 'PLBCF2DAC6FFB0A079';
  console.log('Querying Gemini with Search Grounding for playlist', pid);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Search Google or YouTube to find the list of all video items (in sequential order) in the YouTube playlist with ID "${pid}". Return the list of videos, including their videoId and exact title.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playlistTitle: { type: Type.STRING },
            videos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  videoId: { type: Type.STRING, description: 'The 11-character YouTube video ID' },
                  title: { type: Type.STRING, description: 'The full title of the video' }
                },
                required: ['videoId', 'title']
              }
            }
          },
          required: ['videos']
        }
      }
    });
    
    console.log('STATUS SUCCESS!');
    console.log('Grounding metadata:', JSON.stringify(response.candidates?.[0]?.groundingMetadata, null, 2));
    console.log('TEXT RESPONSE:');
    console.log(response.text);
  } catch (err) {
    console.error('Error querying Gemini:', err);
  }
}

run();
