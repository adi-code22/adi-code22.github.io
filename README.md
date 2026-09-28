# imaditya.tech

Personal site of Aditya Krishnan, live at [imaditya.tech](https://imaditya.tech).

Plain static HTML, CSS and JS served by GitHub Pages. No build step.

```
index.html              the whole page (content lives here)
404.html                GitHub Pages not-found page
assets/css/site.css     styles and theme tokens (light + dark)
assets/js/site.js       theme toggle, local time, copy email, Fig. 1 animation
assets/img/aditya.jpg   portrait
assets/img/og.png       1200×630 social share card
favicon.svg, icons/     favicons and app icons
flutter_service_worker.js  clears the old Flutter build from returning visitors' browsers
resume/                 résumé PDFs
```

Preview locally with `python3 -m http.server` and open http://localhost:8000.

To show the résumé button, put the current PDF at `resume/Adityakrishnan.pdf` and remove `hidden` from the Résumé link in `index.html`.
