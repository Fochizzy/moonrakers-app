# media

Drop the hero portrait here as `portrait.jpg`.

`index.html` loads `media/portrait.jpg`. If the file is absent the `<img>` removes
itself on error and the page shows an `IH` monogram instead, so the site is always
safe to deploy — but `npm run check --workspace @moonrakers/portfolio` will warn
while it is still missing.

A square crop of roughly 500×500 or larger is ideal. The hero renders it in a
250px circle, cropped slightly above center so a face sits correctly; adjust
`object-position` on `.portrait__img` if your crop needs different framing.
