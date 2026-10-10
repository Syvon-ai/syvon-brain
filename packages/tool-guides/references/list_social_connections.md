# list_social_connections

List the social channels connected to THIS workspace — platform, account handle, whether the token has expired, and the WhatsApp phone links. Call this BEFORE any post or send: a channel is connected per workspace, not per person, so being able to post from one workspace says nothing about this one. It also reports channels that are configured but have no credentials on the server, which is what "connected in the UI but nothing sends" actually looks like.

