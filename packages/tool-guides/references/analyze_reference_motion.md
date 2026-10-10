# analyze_reference_motion

Measure how a REFERENCE VIDEO moves, for syvon-recreate: where the cuts are, a frame-by-frame motion curve (which is what tells you the easing and the stagger), where in frame the motion sits, and one vision pass over a filmstrip of the window that names what moves and when. Use it when the user gives you a video or GIF and wants something built LIKE it, before writing the brief. Analyses ONE window (~5s) per call: call it once with no "at" to get the overview plus the opening window, report what you found, and only analyse the next window if the user wants it — or pass "at" to jump straight to a moment they named. For a STILL image use analyze_reference_layout instead. Returns data — it does not write the brief.

## Parameters

### path — string (required)

Workspace-relative path to the reference video (e.g. "projects/my-project/reference.mp4"). .mp4/.mov/.webm/.m4v/.mkv/.gif.

### at — string

Where to look, as a timecode ("0:12") or seconds ("12.5"). Omit it on the FIRST call — that also runs the cut scan, so you can offer the user real moments to choose from. Pass the nextBlockStart from a previous call to continue through the video.

### duration — number

Window length in seconds (default 5, max 10).

