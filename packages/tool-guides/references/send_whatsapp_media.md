# send_whatsapp_media

Send a file from this workspace to one WhatsApp recipient — image, video, audio or document. The portal uploads the bytes to Meta first, because WhatsApp cannot fetch an asset from an auth-gated Syvon URL. Same 24-hour service-window rule as send_whatsapp_message. The file must already exist in the workspace.

## Parameters

### to — string (required)

Recipient in E.164 format.

### path — string (required)

Workspace-relative path to the file to send.

### caption — string

Optional caption. Ignored for audio, which carries none on WhatsApp.

