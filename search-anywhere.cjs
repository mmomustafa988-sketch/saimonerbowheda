const fs = require('fs');
const html = fs.readFileSync('desktop-sample.html', 'utf8');

console.log('Occurrences of playlistVideoRenderer:', html.split('playlistVideoRenderer').length - 1);
console.log('Occurrences of playlistVideoListRenderer:', html.split('playlistVideoListRenderer').length - 1);
console.log('Occurrences of videoRenderer:', html.split('videoRenderer').length - 1);
console.log('Occurrences of playlistVideo:', html.split('playlistVideo').length - 1);
console.log('Occurrences of PLBCF2DAC6FFB0A079:', html.split('PLBCF2DAC6FFB0A079').length - 1);
