const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
let pos = html.indexOf(pid);
let count = 0;
while (pos !== -1) {
  count++;
  console.log(`\nOccurrence ${count} at index ${pos}:`);
  console.log(html.substring(Math.max(0, pos - 150), Math.min(html.length, pos + 250)));
  pos = html.indexOf(pid, pos + 1);
}
