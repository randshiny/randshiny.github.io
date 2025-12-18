# R and Shiny Services — Shiny & R consulting

This folder contains a minimal static site scaffold for the `R and Shiny Services` static website (ready for GitHub Pages).

Preview locally:

```bash
cd website
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Deploy to GitHub Pages:

1. Create a repository on GitHub and push this `website/` folder to the repository root or to a `docs/` folder on the `main` branch.
2. In the repository Settings → Pages, set Source to the branch and folder where the site lives (e.g. `main` / `docs/` or `main` / `/`).

Or push the site to a `gh-pages` branch and enable Pages from that branch.

Customization:
- Replace the contact email in `index.html` with your preferred address (currently `contact@randshiny.com`).
- Update the team bios in `index.html` as needed.
- Add a `CNAME` file if using a custom domain.
