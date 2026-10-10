# compile_design_tokens

Reconcile extracted BrandProfiles, write DNA files (identity, brand, intent), and compile design-tokens.json. Call this after the user confirms the brand review. Accepts optional font and color overrides.

## Parameters

### profiles — array (required)

Array of BrandProfile objects from extract_brand_source results.

### fontOverrides — object

Optional user-confirmed font overrides.

### colorOverrides — object

Optional user-confirmed color overrides. Any role (primary, secondary, tertiary, quaternary, background, surface, text, textMuted, border) is accepted besides brand/accent.

### mergeIntoCustom — boolean

The brand's design-tokens.json is only written while it is still defaults; an edited one is left as it is. Pass true to re-import onto an edited brand anyway — e.g. new colours or a Dark mode added in Figma: only the colours and colour modes the sources provide are merged in (authored mode links that still match are kept); fonts, sizes and everything else stay as edited.

