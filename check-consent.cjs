const fs = require('fs');
const html = fs.readFileSync('desktop-sample.html', 'utf8');

console.log('Title tag:', html.match(/<title>([\s\S]+?)<\/title>/i)?.[1]);
console.log('Occurrences of consent:', html.split('consent').length - 1);
console.log('Occurrences of cookies:', html.split('cookies').length - 1);
console.log('Occurrences of Sign in:', html.split('Sign in').length - 1);
console.log('Occurrences of before you continue:', html.split('Before you continue').length - 1);
console.log('Occurrences of robot:', html.split('robot').length - 1);
console.log('Occurrences of Google:', html.split('Google').length - 1);
console.log('Occurrences of YouTube:', html.split('YouTube').length - 1);
