import { JetBrains_Mono, Onest } from "next/font/google";

// Both cover Azerbaijani (ə, ğ, ş…) via latin-ext, and Russian via cyrillic.
export const onest = Onest({ variable: "--font-onest", subsets: ["latin", "latin-ext", "cyrillic"] });
export const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext", "cyrillic"] });

export const fontClasses = `${onest.variable} ${mono.variable}`;
