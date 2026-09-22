/**
 * Default art-direction.json — curated prompt library for image generation.
 *
 * Three categories:
 *   photo       — nanobanana (Gemini) photographic backgrounds
 *   illustration — abstract/generative visuals (future: .react/.comp GSAP scripts)
 *   graphic      — typography-driven, handled by format kit (no image gen needed)
 *
 * Each prompt template has:
 *   role    — what the image does in the composition (hero, texture, context, etc.)
 *   intent  — art direction notes: composition, mood, what to show
 *   prompt  — the actual generation prompt (composable with brand style)
 *   avoid   — things to explicitly avoid (appended as negative guidance)
 */
export const DEFAULT_ART_DIRECTION = {
  "$schema": "art-direction/v1",
  "version": 1,

  "negativeGlobal": "Absolutely no text, no words, no letters, no numbers, no typography, no logos, no watermarks, no UI elements, no diagrams, no charts, no captions, no labels. Pure visual only. Simple minimal composition, few elements, lots of empty space.",

  "categories": {
    "photo": {
      "description": "Photographic backgrounds. These sit behind text — keep compositions extremely simple with large empty areas.",
      "roles": {
        "hero-dramatic": {
          "intent": "Dark background for bold headlines. Mostly empty with one subtle element.",
          "prompt": "single subject on dark background, dramatic side light, mostly shadow, very simple composition, large empty dark area, shallow depth of field, minimal",
          "avoid": "busy scenes, multiple subjects, complex compositions, clutter, stock photography"
        },
        "hero-clean": {
          "intent": "Light minimal background. Almost empty.",
          "prompt": "minimal photograph, single object on clean surface, soft natural light, muted tones, very generous negative space, almost empty frame, quiet",
          "avoid": "busy compositions, multiple objects, bright colors, complex setups"
        },
        "hero-warm": {
          "intent": "Warm simple background. One texture or surface.",
          "prompt": "warm toned photograph, single natural texture, soft golden light, shallow depth of field, earth tones, simple and quiet, mostly out of focus",
          "avoid": "posed scenes, saturated colors, complex compositions, multiple subjects"
        },
        "context-environment": {
          "intent": "Simple atmospheric place. One architectural element or surface.",
          "prompt": "minimal architectural photograph, single wall or surface, moody ambient light, desaturated, very simple geometric composition, mostly empty",
          "avoid": "complex interiors, multiple elements, busy details, HDR, landmarks"
        },
        "context-detail": {
          "intent": "Close-up of one texture or material. Abstract through proximity.",
          "prompt": "extreme close-up of single material texture, shallow depth of field, natural light, abstract, monochromatic, simple",
          "avoid": "recognizable objects, multiple textures, complex detail, product shots"
        },
        "texture-abstract": {
          "intent": "Pure gradient or soft texture. No subject at all.",
          "prompt": "soft abstract gradient, gentle tonal shift across frame, no subject, no focal point, slightly out of focus, works as background at any crop",
          "avoid": "patterns, objects, sharp detail, complex color, noise"
        }
      }
    },

    "illustration": {
      "description": "Abstract visuals. Keep extremely simple — one element on a dark field.",
      "roles": {
        "generative-pattern": {
          "intent": "Simple geometric pattern. One system, one color.",
          "prompt": "minimal geometric pattern on black background, single accent color, sparse grid, clean vector edges, lots of empty black space",
          "avoid": "complex patterns, multiple colors, noise, busy detail, fractals"
        },
        "botanical-scan": {
          "intent": "Single plant form on black. Scientific simplicity.",
          "prompt": "single botanical specimen on pure black, high contrast monochrome, X-ray aesthetic, centered, simple, clean",
          "avoid": "arrangements, color, multiple specimens, decorative, busy"
        },
        "abstract-form": {
          "intent": "One sculptural shape. Nothing else.",
          "prompt": "single abstract 3D form on dark background, one material, clean studio light, simple shape, minimal",
          "avoid": "multiple objects, complex geometry, busy backgrounds, wireframe"
        },
        "data-topology": {
          "intent": "Sparse dots and lines. Constellation simplicity.",
          "prompt": "sparse constellation of dots and thin lines on black, single accent color, very minimal, mostly empty space, elegant",
          "avoid": "dense networks, infographics, labels, complex data, busy"
        }
      }
    },

    "graphic": {
      "description": "Typography-driven layouts. These are NOT generated as images — they are composed by the format kit using font choice, color palette, and template structure. No image generation needed. This category exists as art direction reference for the format composer.",
      "roles": {
        "type-hero": {
          "intent": "Type IS the visual. Bold display font at maximum scale, minimal supporting elements. The font choice makes or breaks this."
        },
        "type-editorial": {
          "intent": "Magazine-editorial layout. Structured grid, hierarchy through size contrast, serif-sans pairing. Content-dense but controlled."
        },
        "type-brutalist": {
          "intent": "Raw, confrontational typography. Oversized, tightly tracked, breaking grid intentionally. For provocative or disruptive content."
        }
      }
    }
  }
};
