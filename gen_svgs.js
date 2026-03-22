const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'wrkly-web', 'public', 'brand');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function getGradients(prefix) {
    return `
    <defs>
      <linearGradient id="${prefix}_gBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4F7DF7" />
        <stop offset="100%" stop-color="#6366F1" />
      </linearGradient>
      <linearGradient id="${prefix}_gMid" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#5E6EF5" />
        <stop offset="100%" stop-color="#7C5BF0" />
      </linearGradient>
      <linearGradient id="${prefix}_gViolet" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#7C5BF0" />
        <stop offset="100%" stop-color="#8B5CF6" />
      </linearGradient>
    </defs>
    `;
}

// 1. Primary Dark
const f1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 90">
  ${getGradients('f1')}
  <g transform="translate(0, 14)">
    <line x1="14" y1="10" x2="18" y2="25" stroke="#4F7DF7" stroke-width="1" opacity="0.15" />
    <line x1="32" y1="25" x2="36" y2="10" stroke="#5E6EF5" stroke-width="1" opacity="0.15" />
    <line x1="50" y1="10" x2="54" y2="25" stroke="#7C5BF0" stroke-width="1" opacity="0.15" />
    <line x1="68" y1="25" x2="72" y2="10" stroke="#8B5CF6" stroke-width="1" opacity="0.15" />

    <rect x="0" y="0" width="14" height="14" rx="3.5" fill="url(#f1_gBlue)" />
    <rect x="36" y="0" width="14" height="14" rx="3.5" fill="url(#f1_gMid)" />
    <rect x="72" y="0" width="14" height="14" rx="3.5" fill="url(#f1_gViolet)" />
    
    <rect x="18" y="18" width="14" height="14" rx="3.5" fill="url(#f1_gBlue)" opacity="0.7" />
    <rect x="54" y="18" width="14" height="14" rx="3.5" fill="url(#f1_gViolet)" opacity="0.7" />
  </g>
  <text x="118" y="52" font-family="'Outfit', sans-serif" font-weight="500" font-size="40" letter-spacing="3" fill="#EEF1F8">wrkly</text>
  <text x="120" y="72" font-family="'DM Sans', sans-serif" font-weight="500" font-size="10.5" letter-spacing="4" fill="#4D5578">WORKFLOW ENGINE</text>
</svg>`;

// 2. Primary Light
const f2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 90">
  ${getGradients('f2')}
  <g transform="translate(0, 14)">
    <line x1="14" y1="10" x2="18" y2="25" stroke="#4F7DF7" stroke-width="1" opacity="0.12" />
    <line x1="32" y1="25" x2="36" y2="10" stroke="#5E6EF5" stroke-width="1" opacity="0.12" />
    <line x1="50" y1="10" x2="54" y2="25" stroke="#7C5BF0" stroke-width="1" opacity="0.12" />
    <line x1="68" y1="25" x2="72" y2="10" stroke="#8B5CF6" stroke-width="1" opacity="0.12" />

    <rect x="0" y="0" width="14" height="14" rx="3.5" fill="url(#f2_gBlue)" />
    <rect x="36" y="0" width="14" height="14" rx="3.5" fill="url(#f2_gMid)" />
    <rect x="72" y="0" width="14" height="14" rx="3.5" fill="url(#f2_gViolet)" />
    
    <rect x="18" y="18" width="14" height="14" rx="3.5" fill="url(#f2_gBlue)" opacity="0.6" />
    <rect x="54" y="18" width="14" height="14" rx="3.5" fill="url(#f2_gViolet)" opacity="0.6" />
  </g>
  <text x="118" y="52" font-family="'Outfit', sans-serif" font-weight="500" font-size="40" letter-spacing="3" fill="#0F172A">wrkly</text>
  <text x="120" y="72" font-family="'DM Sans', sans-serif" font-weight="500" font-size="10.5" letter-spacing="4" fill="#8B90A8">WORKFLOW ENGINE</text>
</svg>`;

// 3. App Icon Dark
// Block size scaled to 22x22, gaps scaled to 14 Gap = 8, rx=5.5
// x positions: 0, 30, 60
// y positions: 0, bottom=30
const f3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  ${getGradients('f3')}
  <rect x="0" y="0" width="120" height="120" rx="28" fill="#0E1221" />
  <g transform="translate(18, 28)">
    <rect x="0" y="0" width="22" height="22" rx="5.5" fill="url(#f3_gBlue)" />
    <rect x="30" y="0" width="22" height="22" rx="5.5" fill="url(#f3_gMid)" />
    <rect x="60" y="0" width="22" height="22" rx="5.5" fill="url(#f3_gViolet)" />
    
    <rect x="15" y="30" width="22" height="22" rx="5.5" fill="url(#f3_gBlue)" opacity="0.65" />
    <rect x="45" y="30" width="22" height="22" rx="5.5" fill="url(#f3_gViolet)" opacity="0.65" />
  </g>
</svg>`;

// 4. App Icon Light
const f4 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  ${getGradients('f4')}
  <rect x="0" y="0" width="120" height="120" rx="28" fill="#FFFFFF" stroke="#E2E5EE" stroke-width="1" />
  <g transform="translate(18, 28)">
    <rect x="0" y="0" width="22" height="22" rx="5.5" fill="url(#f4_gBlue)" />
    <rect x="30" y="0" width="22" height="22" rx="5.5" fill="url(#f4_gMid)" />
    <rect x="60" y="0" width="22" height="22" rx="5.5" fill="url(#f4_gViolet)" />
    
    <rect x="15" y="30" width="22" height="22" rx="5.5" fill="url(#f4_gBlue)" opacity="0.6" />
    <rect x="45" y="30" width="22" height="22" rx="5.5" fill="url(#f4_gViolet)" opacity="0.6" />
  </g>
</svg>`;

// 5. App Icon Gradient
const f5 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="f5_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E1221" />
      <stop offset="100%" stop-color="#1A1F3A" />
    </linearGradient>
    <radialGradient id="f5_glow" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#4F7DF7" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#4F7DF7" stop-opacity="0" />
    </radialGradient>
  </defs>
  ${getGradients('f5').replace('<defs>', '').replace('</defs>', '')}
  <rect x="0" y="0" width="120" height="120" rx="28" fill="url(#f5_bg)" />
  <rect x="0" y="0" width="120" height="120" rx="28" fill="url(#f5_glow)" />
  <g transform="translate(18, 28)">
    <rect x="0" y="0" width="22" height="22" rx="5.5" fill="url(#f5_gBlue)" />
    <rect x="30" y="0" width="22" height="22" rx="5.5" fill="url(#f5_gMid)" />
    <rect x="60" y="0" width="22" height="22" rx="5.5" fill="url(#f5_gViolet)" />
    
    <rect x="15" y="30" width="22" height="22" rx="5.5" fill="url(#f5_gBlue)" opacity="0.65" />
    <rect x="45" y="30" width="22" height="22" rx="5.5" fill="url(#f5_gViolet)" opacity="0.65" />
  </g>
</svg>`;

// 6. App Icon Mono
const f6 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect x="0" y="0" width="120" height="120" rx="28" fill="#0E1221" />
  <g transform="translate(18, 28)">
    <rect x="0" y="0" width="22" height="22" rx="5.5" fill="#EEF1F8" opacity="1.0" />
    <rect x="30" y="0" width="22" height="22" rx="5.5" fill="#EEF1F8" opacity="0.8" />
    <rect x="60" y="0" width="22" height="22" rx="5.5" fill="#EEF1F8" opacity="0.6" />
    
    <rect x="15" y="30" width="22" height="22" rx="5.5" fill="#EEF1F8" opacity="0.45" />
    <rect x="45" y="30" width="22" height="22" rx="5.5" fill="#EEF1F8" opacity="0.3" />
  </g>
</svg>`;

// 7. Favicon Dark 32
// Mark: block size 6x6, rx=1.5, Positions: (0,0), (9,0), (18,0), (4.5,8), (13.5,8)
const f7 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="0" y="0" width="32" height="32" rx="6" fill="#0E1221" />
  <g transform="translate(4, 7)">
    <rect x="0" y="0" width="6" height="6" rx="1.5" fill="#4F7DF7" />
    <rect x="9" y="0" width="6" height="6" rx="1.5" fill="#6366F1" />
    <rect x="18" y="0" width="6" height="6" rx="1.5" fill="#8B5CF6" />
    
    <rect x="4.5" y="8" width="6" height="6" rx="1.5" fill="#4F7DF7" opacity="0.65" />
    <rect x="13.5" y="8" width="6" height="6" rx="1.5" fill="#8B5CF6" opacity="0.65" />
  </g>
</svg>`;

// 8. Favicon Light 32
const f8 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="0" y="0" width="32" height="32" rx="6" fill="#FFFFFF" stroke="#E2E5EE" stroke-width="0.5" />
  <g transform="translate(4, 7)">
    <rect x="0" y="0" width="6" height="6" rx="1.5" fill="#4F7DF7" />
    <rect x="9" y="0" width="6" height="6" rx="1.5" fill="#6366F1" />
    <rect x="18" y="0" width="6" height="6" rx="1.5" fill="#8B5CF6" />
    
    <rect x="4.5" y="8" width="6" height="6" rx="1.5" fill="#4F7DF7" opacity="0.6" />
    <rect x="13.5" y="8" width="6" height="6" rx="1.5" fill="#8B5CF6" opacity="0.6" />
  </g>
</svg>`;

// 9. Favicon 16
// Block 3x3, rx=0.75, pos (0,0), (4.5,0), (9,0), (2.25,4), (6.75,4)
const f9 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect x="0" y="0" width="16" height="16" rx="3" fill="#0E1221" />
  <g transform="translate(2, 3.5)">
    <rect x="0" y="0" width="3" height="3" rx="0.75" fill="#4F7DF7" />
    <rect x="4.5" y="0" width="3" height="3" rx="0.75" fill="#6366F1" />
    <rect x="9" y="0" width="3" height="3" rx="0.75" fill="#8B5CF6" />
    
    <rect x="2.25" y="4" width="3" height="3" rx="0.75" fill="#4F7DF7" opacity="0.65" />
    <rect x="6.75" y="4" width="3" height="3" rx="0.75" fill="#8B5CF6" opacity="0.65" />
  </g>
</svg>`;

// 10. Avatar Dark
// Circle 60,60,r=60, fill #0E1221, Block 20x20, rx=5
// Pos (0,0), (28,0), (56,0), (14,26), (42,26)
const f10 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  ${getGradients('f10')}
  <circle cx="60" cy="60" r="60" fill="#0E1221" />
  <g transform="translate(22, 32)">
    <rect x="0" y="0" width="20" height="20" rx="5" fill="url(#f10_gBlue)" />
    <rect x="28" y="0" width="20" height="20" rx="5" fill="url(#f10_gMid)" />
    <rect x="56" y="0" width="20" height="20" rx="5" fill="url(#f10_gViolet)" />
    
    <rect x="14" y="26" width="20" height="20" rx="5" fill="url(#f10_gBlue)" opacity="0.65" />
    <rect x="42" y="26" width="20" height="20" rx="5" fill="url(#f10_gViolet)" opacity="0.65" />
  </g>
</svg>`;

// 11. Avatar Light
const f11 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="#FFFFFF" />
  <circle cx="60" cy="60" r="59.5" fill="none" stroke="#E2E5EE" stroke-width="1" />
  <g transform="translate(22, 32)">
    <rect x="0" y="0" width="20" height="20" rx="5" fill="#4F7DF7" />
    <rect x="28" y="0" width="20" height="20" rx="5" fill="#6366F1" />
    <rect x="56" y="0" width="20" height="20" rx="5" fill="#8B5CF6" />
    
    <rect x="14" y="26" width="20" height="20" rx="5" fill="#4F7DF7" opacity="0.6" />
    <rect x="42" y="26" width="20" height="20" rx="5" fill="#8B5CF6" opacity="0.6" />
  </g>
</svg>`;

// 12. OG Social
// BG gradient #080B14 to #111631
// Radial glow 30% left, 40% top, #4F7DF7 at 8%
// Block 54x54, rx=14
// Pos: (0,0), (78,0), (156,0), (39,72), (117,72)
const f12 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="f12_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080B14" />
      <stop offset="100%" stop-color="#111631" />
    </linearGradient>
    <radialGradient id="f12_glow" cx="30%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#4F7DF7" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#4F7DF7" stop-opacity="0" />
    </radialGradient>
  </defs>
  ${getGradients('f12').replace('<defs>', '').replace('</defs>', '')}
  
  <rect x="0" y="0" width="1200" height="630" fill="url(#f12_bg)" />
  <rect x="0" y="0" width="1200" height="630" fill="url(#f12_glow)" />
  
  <g transform="translate(168, 216)">
    <rect x="0" y="0" width="54" height="54" rx="14" fill="url(#f12_gBlue)" />
    <rect x="78" y="0" width="54" height="54" rx="14" fill="url(#f12_gMid)" />
    <rect x="156" y="0" width="54" height="54" rx="14" fill="url(#f12_gViolet)" />
    
    <rect x="39" y="72" width="54" height="54" rx="14" fill="url(#f12_gBlue)" opacity="0.65" />
    <rect x="117" y="72" width="54" height="54" rx="14" fill="url(#f12_gViolet)" opacity="0.65" />
  </g>
  
  <text x="420" y="280" font-family="'Outfit', sans-serif" font-weight="500" font-size="120" letter-spacing="3" fill="#EEF1F8">wrkly</text>
  <text x="424" y="340" font-family="'DM Sans', sans-serif" font-weight="500" font-size="32" letter-spacing="12" fill="#4D5578">WORKFLOW ENGINE</text>
</svg>`;

const files = {
    'wrkly-primary-lockup-dark.svg': f1,
    'wrkly-primary-lockup-light.svg': f2,
    'wrkly-app-icon-dark.svg': f3,
    'wrkly-app-icon-light.svg': f4,
    'wrkly-app-icon-gradient.svg': f5,
    'wrkly-app-icon-mono.svg': f6,
    'wrkly-favicon-dark-32.svg': f7,
    'wrkly-favicon-light-32.svg': f8,
    'wrkly-favicon-16.svg': f9,
    'wrkly-avatar-dark.svg': f10,
    'wrkly-avatar-light.svg': f11,
    'wrkly-og-social.svg': f12
};

for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), '<!-- ' + name + ' -->\\n' + content);
}
console.log('Generated 12 SVG files successfully.');
