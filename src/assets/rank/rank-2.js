// The silver podium frame — ported from frontend/src/assets/rank/rank-2.svg,
// byte for byte. React Native has no SVG loader, so the drawing is kept as
// its own markup and handed to react-native-svg's SvgXml (the same way the
// logo is carried). Nothing here is redrawn: change the web file and port it
// again, which `npm run drift` asks for.
export default `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none" role="img" aria-label="KhelScore rank 2 circular profile frame">
<title>KhelScore Rank 2 Profile Frame</title>
<defs>
 <linearGradient id="ringGrad" x1="90" y1="70" x2="405" y2="390" gradientUnits="userSpaceOnUse"><stop stop-color="#F7FBFF"/><stop offset=".28" stop-color="#B9C5D6"/><stop offset=".56" stop-color="#F7FBFF"/><stop offset=".8" stop-color="#B9C5D6"/><stop offset="1" stop-color="#52657E"/></linearGradient>
 <linearGradient id="leafGrad" x1="25" y1="280" x2="145" y2="440" gradientUnits="userSpaceOnUse"><stop stop-color="#F7FBFF"/><stop offset=".5" stop-color="#A9B8CB"/><stop offset="1" stop-color="#52657E"/></linearGradient>
 <linearGradient id="medalGrad" x1="215" y1="362" x2="302" y2="449" gradientUnits="userSpaceOnUse"><stop stop-color="#F7FBFF"/><stop offset=".48" stop-color="#B9C5D6"/><stop offset="1" stop-color="#52657E"/></linearGradient>
 <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity=".22"/></filter>
</defs>
<!-- transparent center: place the user/team avatar behind this frame -->
<g filter="url(#shadow)">
 <circle cx="256" cy="226" r="169" stroke="#52657E" stroke-width="19"/>
 <circle cx="256" cy="226" r="169" stroke="url(#ringGrad)" stroke-width="14"/>
 <circle cx="256" cy="226" r="157" stroke="#F7FBFF" stroke-opacity=".85" stroke-width="2.5"/>
 
 <circle cx="256" cy="405" r="43" fill="#52657E"/>
 <circle cx="256" cy="401" r="41" fill="url(#medalGrad)" stroke="#F7FBFF" stroke-width="3"/>
 <circle cx="256" cy="401" r="33.5" stroke="#52657E" stroke-opacity=".65" stroke-width="1.5"/>
 <text x="256" y="415" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="43" font-weight="800" fill="#F4F8FF" stroke="#52657E" stroke-width=".8" paint-order="stroke">2</text>
</g>
</svg>`;
