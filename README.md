# Cyber Shield: Social Engineering Lab (static version)

A static, no-backend social-engineering learning lab with topic pages and a
20-question scored assessment. Every file here is plain HTML/CSS/JS, so it
can be hosted for free on **GitHub Pages** — no Python, no Flask, no server.

## What changed from the Flask version

The original project used a Flask backend so the assessment's correct
answers never left the server. GitHub Pages only serves static files — it
cannot run Python — so that backend can't come along. This version moves
the quiz logic into `assessment.js`, and:

- Each question stores a **SHA-256 hash** of the correct option text
  (see `quiz-data.js`) instead of a plain "correct index." Someone doing a
  quick "View Page Source" won't see the answers written out.
- Progress is kept in the browser's `sessionStorage` instead of a Flask
  session cookie, so refreshing the page mid-quiz still works.
- Question and option order are shuffled in the browser with the same
  logic the Flask version used.

**Be honest with yourself about the limit here:** hashing raises the bar
above "answers are sitting in plain text," but it is not real security.
Anyone who opens the browser console and hashes each visible option
themselves can still work out the answer, because with no server left,
the browser itself has to be able to check the answer — there's nowhere
left to keep a real secret. If you ever need answers that students truly
cannot recover this way, you need an actual backend (keep the Flask
version deployed somewhere that runs Python, e.g. Render, Railway,
PythonAnywhere, or Vercel) instead of GitHub Pages.

## Project structure

```text
.
├── index.html          (topic overview)
├── phishing.html, smishing.html, vishing.html, pretexting.html,
│   baiting.html, tailgating.html, shoulder.html, quid.html
├── styles.css
├── assessment.html      (the 20-question quiz)
├── assessment.css
├── assessment.js        (quiz logic — replaces the old Flask API)
└── quiz-data.js          (questions, options, and hashed answers)
```

## Run it locally

Browsers restrict some APIs (including the `crypto.subtle` hashing used
here) when a page is opened directly as a `file://` URL, so serve the
folder with a tiny local server instead of double-clicking `index.html`:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Host it on GitHub Pages

1. Create a new GitHub repository and push everything in this folder to
   its `main` branch:

   ```bash
   git init
   git add .
   git commit -m "Static Cyber Shield lab"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

2. On GitHub, open the repository's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a
   branch," pick the **main** branch and the **/ (root)** folder, then
   save.
4. GitHub publishes the site at
   `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/` within a minute or
   two (refresh the Pages settings page to see the link).

You can also upload the files with GitHub's web interface instead of
using Git.

## Optional Question 13 hint image

Question 13 works without an image. To enable the optional hint, add an
image file named:

```text
hint13.png
```

next to `assessment.html`.

## Assessment behavior

- Correct answers are stored as SHA-256 hashes in `quiz-data.js`, not
  plain text (see the honesty note above for what this does and doesn't
  protect against).
- Question and answer ordering is randomized on the client.
- Progress and score are kept in the browser's `sessionStorage` for the
  current tab/session.
- Question 13 can be answered without opening its optional hint.

## Safety design

- Uses fictional examples.
- Does not request real passwords, OTPs, or personal information.
- Does not send captured credentials or student information anywhere —
  everything now runs entirely in the visitor's browser.
- Clearly functions as a social-engineering awareness simulation.
