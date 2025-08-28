app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  if (req.body.object !== 'whatsapp_business_account') {
    console.log('Invalid object type - not a WhatsApp webhook');
    res.sendStatus(200);
    return;
  }

  if (!req.body.entry || !req.body.entry[0].changes || !req.body.entry[0].changes[0] || !req.body.entry[0].changes[0].value.messages || !req.body.entry[0].changes[0].value.messages[0]) {
    console.log('No valid message in payload - possibly a status update or other event');
    res.sendStatus(200);
    return;
  }

  if (req.body.entry[0].changes[0].value.messages[0].type !== 'text') {
    console.log('Message type is not text - skipping echo');
    res.sendStatus(200);
    return;
  }

  const phoneNumberId = req.body.entry[0].changes[0].value.metadata.phone_number_id;
  const from = req.body.entry[0].changes[0].value.messages[0].from;
  const msgBody = req.body.entry[0].changes[0].value.messages[0].text.body;

  console.log(`Processing message: From ${from}, Body: ${msgBody}, Phone ID: ${phoneNumberId}`);

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
    if (!response.ok) {
      console.error(`API error: Status ${response.status}, Details:`, JSON.stringify(json, null, 2));
    } else {
      console.log('Echo sent successfully:', JSON.stringify(json, null, 2));
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }

  res.sendStatus(200);
});
