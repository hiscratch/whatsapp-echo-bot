// Import required modules
const express = require('express');
const fetch = require('node-fetch');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies (with increased limit for larger payloads)
app.use(express.json({ limit: '3mb' }));

// Set port and environment variables
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const accessToken = process.env.ACCESS_TOKEN;

// Route for webhook verification (GET requests)
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for incoming webhooks (POST requests)
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Process only if it's a valid WhatsApp message webhook
  if (req.body.object === 'whatsapp_business_account' &&
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]) {

    const phoneNumberId = req.body.entry[0].changes[0].value.metadata.phone_number_id;
    const from = req.body.entry[0].changes[0].value.messages[0].from; // Sender's WhatsApp ID
    const msgBody = req.body.entry[0].changes[0].value.messages[0].text.body; // Message text

    // Prepare the API URL and data for echoing the message
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: from,
      type: 'text',
      text: {
        preview_url: false,
        body: `Echo: ${msgBody}`
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
      });

      const json = await response.json();
      console.log('Echo response:', JSON.stringify(json, null, 2));
    } catch (err) {
      console.error('Error sending echo:', err);
    }
  }

  // Always acknowledge the webhook
  res.sendStatus(200);
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
