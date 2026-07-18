const { GoogleGenAI } = require('@google/genai');

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    return;
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  console.log(`Asking Gemini to fetch playlist ${pid} using Google Search Grounding...`);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Search Google and YouTube to retrieve the complete list of all video items (in their exact sequential order) in the YouTube playlist with ID "${pid}". Return the exact list of videos as a JSON array. Each video object in the array MUST contain "videoId" and "title" properties. Output ONLY the raw JSON block without any markdown formatting or extra text.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    console.log('Gemini Response:');
    console.log(response.text);

    const data = JSON.parse(response.text);
    console.log(`Success! Extracted ${data.length || 0} videos.`);
    if (data.length > 0) {
      console.log('First video:', data[0]);
    }
  } catch (err) {
    console.error('Gemini call failed:', err);
  }
}

run();
