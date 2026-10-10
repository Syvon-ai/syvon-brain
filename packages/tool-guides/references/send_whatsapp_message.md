# send_whatsapp_message

Send a WhatsApp text message from this workspace to one recipient. WhatsApp is MESSAGING: there is no "post to WhatsApp", so this always addresses a specific number in E.164 form (+14155552671). It only works INSIDE the 24-hour service window that opens when that person last messaged the business — outside it Meta rejects free text and you must use send_whatsapp_template instead. Reaches a real person: confirm the recipient and the wording with the user first.

## Parameters

### to — string (required)

Recipient in E.164 format, e.g. +14155552671

### text — string (required)

Message body.

