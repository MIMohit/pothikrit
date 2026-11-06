# Pothikrit (পথিকৃৎ) — website

Static website for **Pothikrit — Organisation for Digital Rights, Cyber Safety & Legal Awareness (ODRCSLA)**, an independent, non-governmental organisation in Bangladesh (est. 30 October 2026).

Plain HTML + one CSS file + one small vanilla JS file. No framework, no build step, no external JavaScript — the only external resource is Google Fonts (Cormorant Garamond, Inter, Noto Serif Bengali). Deploy the folder as-is to any static host (GitHub Pages, Netlify, Cloudflare Pages…).

## File structure

```
index.html          Homepage (hero, about, areas of focus, founder's message, team, helplines, contact form)
contact.html        Contact page (form, email, helplines, disclaimer)
digital-safety.html Digital Safety guide (For you)
know-your-rights.html Know Your Rights guide (For you)
research.html       Research & Publications (coming soon)
awareness.html      Awareness Programmes (coming soon)
terms.html          Terms & Conditions
privacy.html        Privacy Policy
disclaimer.html     Legal Disclaimer
legal.html          Index of the three legal pages
404.html            Not-found page (uses root-relative /assets/… paths so it works at any URL depth)
robots.txt
sitemap.xml         Base URL https://pothikrit.org
vercel.json         Vercel config: no build, static output from root, security headers
.gitignore
assets/
  css/styles.css    All styles; colours/fonts are CSS custom properties at the top
  js/main.js        Mobile menu, nav dropdowns, scroll reveal, contact-form handling
  img/logo.jpg                 512px circular-cropped logo
  img/favicon-64.png           Favicon
  img/apple-touch-icon.png     180px touch icon
  img/team/*.jpg               Web-optimised team portraits (max 900px)
```

The original source images (`logo.jpg`, `Soily.png`, `Rani.jpeg`, …) in the repository root are kept untouched; the site only uses the optimised copies in `assets/img/`. They can be moved out of the deployed folder if you want a smaller upload.

## Preview locally

```sh
cd /path/to/Pothikrit
python3 -m http.server 8000
# open http://localhost:8000/
```

(Opening the files directly with `file://` also works for every page except `404.html`, which uses root-relative paths.)

## Contact form

The form in `index.html` and `contact.html` has a `data-endpoint` attribute, empty by default.

- **No endpoint (default):** on submit, the script validates the fields and then opens the visitor's email app with a message to `info@pothikrit.org` pre-filled (subject + body). The page says clearly that the message has **not** been sent until they press Send in their email app.
- **With an endpoint:** the script POSTs the form data (as `FormData`, `Accept: application/json`) and only shows "sent" when the endpoint returns a success status. On failure it says nothing was delivered and offers the email fallback.

To connect a form service, edit the `<form … data-endpoint="">` in both pages:

- **Formspree:** create a form at formspree.io, then `data-endpoint="https://formspree.io/f/YOUR_FORM_ID"`.
- **Web3Forms:** get an access key at web3forms.com, set `data-endpoint="https://api.web3forms.com/submit"` and add `<input type="hidden" name="access_key" value="YOUR_ACCESS_KEY">` inside the form.

Optionally also change the form's `action` (currently a `mailto:` fallback for visitors without JavaScript) to the same URL.

Tip: `contact.html?subject=programme` pre-selects "Request an awareness programme" (also `general`, `partnership`, `media`, `volunteering`).

## Deploy on Vercel

The site is hosted on Vercel from the GitHub repo [`MIMohit/pothikrit`](https://github.com/MIMohit/pothikrit).

1. In Vercel, **Add New… → Project** and import `MIMohit/pothikrit`.
2. **Framework Preset:** Other.
3. **Build Command:** leave empty / off (there is no build step). **Install Command:** none.
4. **Output Directory:** `.` (the repository root). **Root Directory:** leave as the repo root.
5. Deploy. Every push to `main` redeploys; pull requests get preview URLs.
6. Add the custom domain `pothikrit.org` under **Settings → Domains**.

`vercel.json` keeps this explicit (no build, output from the root), leaves `cleanUrls` off so the site's `.html` links keep working exactly as written, and adds security headers to every response (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`). Vercel serves `404.html` automatically for unknown paths.

Note: the original full-size images in the repo root (`logo.jpg`, `Soily.png`, …) are not used by the site but will be publicly reachable once deployed; move them out of the repo (or add a `.vercelignore`) if that matters.

## Other hosts

- **Netlify / Cloudflare Pages:** publish the repository root; `404.html` is picked up automatically.
- **GitHub Pages:** serve from the repository root. With a custom domain (pothikrit.org) everything works as-is. If served from a project sub-path (`user.github.io/repo/`), update the root-relative paths in `404.html`.
- If the final domain is not `https://pothikrit.org`, update the canonical / Open Graph URLs in each page's `<head>`, the JSON-LD in `index.html`, `robots.txt` and `sitemap.xml`.

## TODO

- [ ] Social links in the footer (Website, LinkedIn, Facebook) are `href="#"` placeholders — marked with a `TODO` comment in every page.
- [ ] Team photos missing for **Sumaya Yesmin, Sneha Chakma, Kuspean Dewan** (Digital Safety & Multidisciplinary Unit) and **Aong Ching Marma** (Community Outreach Unit); they currently show unit badges (DSU / COU).
- [ ] Legal text (Terms, Privacy Policy, Disclaimer) should be reviewed by a lawyer before launch.
- [ ] Connect the contact form to an endpoint (see above), if direct submissions are wanted.
- [ ] Researched content for digital-safety.html and know-your-rights.html (placeholders marked `<!-- CONTENT:… -->`); Research and Awareness pages are "Coming soon".
