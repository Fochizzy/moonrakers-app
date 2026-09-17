# media

The hero portrait lives here as `portrait.jpg`.

`index.html` loads `media/portrait.jpg`. If the file is absent the `<img>` removes
itself on error and the page shows an `IH` monogram instead, so the site is always
safe to deploy — and `npm run check --workspace @moonrakers/portfolio` warns while
it is missing.

The current photo is 2544x3392 (3:4). Because it is taller than the square frame,
`object-fit: cover` crops it vertically and `object-position: center 0%` picks the
band containing the face. The subject still sits high in a 3:4 frame, so
`.portrait__img` also scales to 1.35 about `center 30%` to fill the circle without
cutting into the hair or the chin.

Swapping in a photo with a different aspect ratio or framing means re-tuning that
scale and origin — render the hero and look, rather than guessing.
