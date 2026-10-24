# DNAProved website

Static website for DNAProved, a New Jersey DNA lab offering bird DNA sexing, DNA species ID, eDNA water screening and fermentation microbe testing. Plain HTML, CSS and JavaScript with GSAP animations, a Claude-powered chat assistant (Netlify Function) and an order form that emails requests through Netlify Forms.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: live gel, peer-reviewed statistics, the four services, how it works, quality controls, comparison, offers |
| `services.html` | Full service details, collection instructions, prices, price estimator, comparison, sample policy, FAQ |
| `science.html` | Deep dive: DNA, extraction, PCR simulator, gels, bird sexing, Sanger sequencing, barcoding, eDNA, microbes, references |
| `order.html` | Order composer with preset emails per service |
| `credits.html` | Picture sources and licences |
| `404.html` | Not-found page |

## Deploy on Netlify

1. In Netlify, choose **Add new site → Import an existing project** and pick this GitHub repository. No build command is needed; `netlify.toml` publishes the repository root and deploys the function in `netlify/functions`.
2. **Chat assistant:** in **Site configuration → Environment variables**, add `ANTHROPIC_API_KEY` with a key from the Claude Console. Optional: `CHAT_MODEL` to use another Claude model (default `claude-opus-5-5`; `claude-haiku-5-5` is cheaper and faster). Set a monthly spend limit in the Claude Console. Without a key, the widget answers from its built-in FAQ.
3. **Order emails:** after the first deploy, open **Forms** and enable form detection if asked, then go to **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification**, choose the `order-inquiry` form and enter `dna.proved@gmail.com`. Each order then arrives in that inbox with the customer's name, company, email and message.
4. Redeploy once after enabling forms so Netlify registers the `order-inquiry` form.

## Editing

- **Prices and discounts:** `PRICING`, `VOLUME` and `GROUP` at the top of `assets/js/site.js` (the estimator), plus the matching text in `index.html`, `services.html` and the chat knowledge in `netlify/functions/chat/knowledge.mjs`.
- **Order email templates:** `TEMPLATES` in `assets/js/order.js`.
- **Chat assistant knowledge:** `netlify/functions/chat/knowledge.mjs`.
- **Colours and type:** tokens at the top of `assets/css/site.css`.

Nothing is fixed in the bottom-right corner of any page, so the Netlify badge never covers content; the chat button sits bottom-left.

## Picture credits

Photographs and illustrations come from Wikimedia Commons under public domain, CC0, CC BY and CC BY-SA licences, listed in `assets/img/credits.json` and on `credits.html`.
