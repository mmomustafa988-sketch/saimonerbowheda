console.log('YOUTUBE_API_KEY present?', !!process.env.YOUTUBE_API_KEY);
console.log('GEMINI_API_KEY present?', !!process.env.GEMINI_API_KEY);
if (process.env.YOUTUBE_API_KEY) {
  console.log('YOUTUBE_API_KEY starts with:', process.env.YOUTUBE_API_KEY.substring(0, 8));
}
