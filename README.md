# DNAProved website

Static website for DNAProved, a New Jersey DNA lab offering bird DNA sexing, DNA species ID, eDNA water screening and fermentation microbe testing. Plain HTML, CSS and JavaScript with GSAP animations, a Claude-powered chat assistant (Netlify Function) and an order form that emails requests through Netlify Forms.

## Pages

| File | What it is |
| --- | --- |
| `site/index.html` | Home: helix hero, live gel, statistics, 3D services carousel with arrows, service detail tabs, how it works, quality controls and sample policy, full comparison, launch offer banners, price table, estimator, FAQ |
| `site/science.html` | Deep dive: DNA, extraction, PCR simulator, gels, bird sexing, Sanger sequencing, barcoding, eDNA, microbes, references |
| `site/order.html` | Order composer with preset emails per service |
| `site/credits.html` | Picture sources and licences |
| `site/404.html` | Not-found page |
| `site/_redirects` | Sends old /services.html links to the home page |

## The immersive layer

- `site/assets/js/scene.js` — a Three.js particle world (about 18,000 points on desktop, 7,000 on phones) that re-forms per section: DNA helix, unzipping helix, gel bands, Z/W chromosomes, barcode, Sanger trace, lake water, yeast cells and the DNAProved wordmark. Sections choose their formation with `data-scene="…"`. Particles scatter from the cursor and spin faster with scroll speed.
- `site/assets/js/fx.js` — sequencing preloader (first page of a visit), gel-lane page transitions, Lenis smooth scrolling, headings that decode out of A/C/G/T, custom cursor, magnetic buttons, card tilt, velocity-reactive marquees, film grain, progress bar and the pinned 3D services carousel.
- `site/assets/css/fx.css` — styles for all of the above.
- Visitors who prefer reduced motion get the full content without the motion; browsers without WebGL get the same pages on a dark background.

## Deploy by drag and drop (Netlify Drop)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) (sign in first so the site is saved to your account).
2. Drag `DNAProved-netlify.zip` itself onto the page. If you unzip it instead, drag the folder whose top level contains `index.html`, never a folder above it, or the site ends up one level too deep and the home page shows "That page isn't here".
3. The drag-and-drop zip is static only: the pages, `assets/` and a `_headers` file, with no `package.json`, `netlify.toml` or functions, so Netlify publishes it without a build. (A zip containing `package.json` makes Drop attempt a build, which failed at "Initializing".)
4. The AI chat function isn't included in a drag-and-drop deploy, so the chat widget answers from its built-in FAQ. For the full AI assistant, deploy from GitHub as below.
5. Order emails: in **Forms**, enable form detection, redeploy, then add the email notification described in step 3 of the GitHub method.

## Deploy from GitHub

1. In Netlify, choose **Add new site → Import an existing project** and pick this GitHub repository. `netlify.toml` sets a no-op build command, publishes the `site/` folder and deploys the function in `netlify/functions`.
2. **Chat assistant:** in **Site configuration → Environment variables**, add `ANTHROPIC_API_KEY` with a key from the Claude Console. Optional: `CHAT_MODEL` to use another Claude model (default `claude-opus-5-5`; `claude-haiku-5-5` is cheaper and faster). Set a monthly spend limit in the Claude Console. Without a key, the widget answers from its built-in FAQ.
3. **Order emails:** after the first deploy, open **Forms** and enable form detection if asked, then go to **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification**, choose the `order-inquiry` form and enter `dna.proved@gmail.com`. Each order then arrives in that inbox with the customer's name, company, email and message.
4. Redeploy once after enabling forms so Netlify registers the `order-inquiry` form.

## Editing

- **Prices and discounts:** `PRICING`, `VOLUME` and `GROUP` at the top of `site/assets/js/site.js` (the estimator), plus the matching text in `site/index.html` and the chat knowledge in `netlify/functions/chat/knowledge.mjs`.
- **Order email templates:** `TEMPLATES` in `site/assets/js/order.js`.
- **Chat assistant knowledge:** `netlify/functions/chat/knowledge.mjs`.
- **Colours and type:** tokens at the top of `site/assets/css/site.css`.

Nothing is fixed in the bottom-right corner of any page, so the Netlify badge never covers content; the chat button sits bottom-left.

## Picture credits

Photographs and illustrations come from Wikimedia Commons under public domain, CC0, CC BY and CC BY-SA licences, listed in `site/assets/img/credits.json` and on `credits.html`.
