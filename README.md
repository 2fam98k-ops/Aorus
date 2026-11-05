# VYPRA — gaming hardware storefront (static site + admin)

Pure HTML/CSS/JS. No build step, no server — works on GitHub Pages.

## Deploy
1. Create a GitHub repo and upload everything in this folder (keep the folder structure).
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<you>.github.io/<repo>/`.

## Admin mode
Open `/admin.html`. Default password: **admin123** (change it under *Publish*).

| Tab | What you can do |
|---|---|
| Products | Add / edit / duplicate / delete products, upload images, key features with visuals, spec table, featured flag |
| Home visuals | Add, reorder, edit hero slides (title, text, button, banner image) |
| Brand & colors | Name, logo, footer, live color theme, "why us" highlights |
| Categories | Add / rename / remove categories |
| Publish | Push straight to GitHub, or download `site.json` and commit it yourself |

Edits are saved as a **draft in your browser**. Visitors only see them after you publish.

### Publish straight to GitHub
Create a fine-grained personal access token limited to this repo with **Contents: Read and write**, paste it in the Publish tab. Uploaded images are committed to `assets/uploads/`, and `data/site.json` is updated.

### Security note
Admin password is a convenience lock in your own browser. The real protection is that only someone with repo access/your token can change the live site.

## Customising
- All content lives in `data/site.json`.
- Colors/fonts: `css/style.css` (variables at the top) or the admin Brand tab.
- Product artwork is generated SVG, so the site ships with no third-party imagery. Upload your own product photos in admin.
