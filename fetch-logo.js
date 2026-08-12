const https = require('https');

https.get('https://clarive.com/wp-content/themes/clarive7/images/clarive_REGISTERED.svg', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    console.log(data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
