# import_figma

Import components and design tokens from a Figma file or frame URL. Creates .react files (legacy alias: .comp) and updates tokens.json.

## Parameters

### figmaUrl — string (required)

Figma URL (file or frame link with node-id)

### syncTokensOnly — boolean

When true, only sync tokens without re-importing components

