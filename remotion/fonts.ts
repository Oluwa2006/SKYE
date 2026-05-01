// ─── Font preloader ────────────────────────────────────────────────────────────
// Call loadFont() at module level — Remotion waits for all fonts before
// rendering the first frame. Import this file in Root.tsx to ensure fonts
// are bundled on Lambda.
//
// Covers the most common ad fonts Gemini will identify. If a schema references
// a font not in this list it falls back to sans-serif (cosmetically similar).

import { loadFont as loadInter }            from "@remotion/google-fonts/Inter";
import { loadFont as loadMontserrat }       from "@remotion/google-fonts/Montserrat";
import { loadFont as loadOswald }           from "@remotion/google-fonts/Oswald";
import { loadFont as loadBarlow }           from "@remotion/google-fonts/Barlow";
import { loadFont as loadBarlowCondensed }  from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadPoppins }          from "@remotion/google-fonts/Poppins";
import { loadFont as loadRaleway }          from "@remotion/google-fonts/Raleway";
import { loadFont as loadPlayfairDisplay }  from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadDMSans }           from "@remotion/google-fonts/DMSans";
import { loadFont as loadAnton }            from "@remotion/google-fonts/Anton";
import { loadFont as loadBebasNeue }        from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadLato }             from "@remotion/google-fonts/Lato";
import { loadFont as loadRoboto }           from "@remotion/google-fonts/Roboto";
import { loadFont as loadRobotoCondensed }  from "@remotion/google-fonts/RobotoCondensed";
import { loadFont as loadNunitoSans }       from "@remotion/google-fonts/NunitoSans";

loadInter(          "normal", { weights: ["300","400","500","600","700","800","900"] });
loadMontserrat(     "normal", { weights: ["300","400","500","600","700","800","900"] });
loadOswald(         "normal", { weights: ["300","400","500","600","700"] });
loadBarlow(         "normal", { weights: ["300","400","500","600","700","800","900"] });
loadBarlowCondensed("normal", { weights: ["300","400","500","600","700","800","900"] });
loadPoppins(        "normal", { weights: ["300","400","500","600","700","800","900"] });
loadRaleway(        "normal", { weights: ["300","400","500","600","700","800","900"] });
loadPlayfairDisplay("normal", { weights: ["400","700"] });
loadDMSans(         "normal", { weights: ["300","400","500","600","700","800","900"] });
loadAnton(          "normal", { weights: ["400"] });
loadBebasNeue(      "normal", { weights: ["400"] });
loadLato(           "normal", { weights: ["300","400","700","900"] });
loadRoboto(         "normal", { weights: ["300","400","500","600","700","800","900"] });
loadRobotoCondensed("normal", { weights: ["300","400","500","600","700","800","900"] });
loadNunitoSans(     "normal", { weights: ["300","400","500","600","700","800","900"] });

// Font family name map — normalises common Gemini output strings to the exact
// Google Font name that matches the @remotion/google-fonts import above.
export const FONT_ALIASES: Record<string, string> = {
  // Inter variants
  "inter":                  "Inter",
  // Montserrat variants
  "montserrat":             "Montserrat",
  // Barlow variants
  "barlow":                 "Barlow",
  "barlow condensed":       "Barlow Condensed",
  "barlowcondensed":        "Barlow Condensed",
  // Oswald
  "oswald":                 "Oswald",
  // Poppins
  "poppins":                "Poppins",
  // Raleway
  "raleway":                "Raleway",
  // Playfair
  "playfair":               "Playfair Display",
  "playfair display":       "Playfair Display",
  // DM Sans
  "dm sans":                "DM Sans",
  "dmsans":                 "DM Sans",
  // Display / condensed
  "anton":                  "Anton",
  "bebas neue":             "Bebas Neue",
  "bebas":                  "Bebas Neue",
  // Lato / Roboto family
  "lato":                   "Lato",
  "roboto":                 "Roboto",
  "roboto condensed":       "Roboto Condensed",
  "nunito":                 "Nunito Sans",
  "nunito sans":            "Nunito Sans",
};

/** Resolve a font name string from the schema to a loaded font family. */
export function resolveFont(rawFamily: string): string {
  const key = rawFamily.toLowerCase().trim();
  return FONT_ALIASES[key] ?? rawFamily;
}
