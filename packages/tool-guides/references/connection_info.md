# connection_info

Report which Syvon workspace this connection is bound to, plus its brand, a survey of top-level folders, and which generation lanes (image, video, voice) actually work here. Call this FIRST when a path is not found, when results look like they belong to another project, whenever the user asks which workspace they are working in — a connector is scoped to one workspace chosen at sign-in and never says so on its own — and BEFORE planning any piece that depends on a generated image, video or voice-over, since those keys can be absent and you would otherwise discover it only at the moment of the call.

