# send_whatsapp_template

Send a pre-approved WhatsApp template to one recipient. This is the ONLY message a business may send outside the 24-hour service window — use it for a first contact or a scheduled notification, and send_whatsapp_message inside the window. Get `name` and `language` from list_whatsapp_templates; do not guess them. Reaches a real person: confirm before calling.

## Parameters

### to — string (required)

Recipient in E.164 format.

### name — string (required)

Template name, exactly as list_whatsapp_templates reports it.

### language — string (required)

Language code for that template, e.g. en_US.

### components — array

Meta's template components array, filling the template's variables. Omit for a template with no variables.

