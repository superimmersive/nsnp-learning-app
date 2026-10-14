# NSNP Learning App

Web app that digitises the National School Nutrition Programme (NSNP) roadshow
presentation for School Management Teams (Eden and Central Karoo Education District).

## Goal
Turn the 47-slide training deck into an interactive, mobile-friendly learning app:
short modules, quizzes, checklists and printable forms.

## Proposed modules
1. What is the NSNP and who's who
2. Preparation area: required documents and posters
3. Volunteer Food Handlers: appointment, duties, honoraria, UIF
4. NSNP Committee: roles (principal, SMT, SGB, food handler, coordinator, RCL)
5. Monthly forms: feeding register, stock form, proof of payment (due by the 7th)
6. Menu, measurements and feeding times
7. Feeding with dignity and sample (ghost) plates
8. Food safety and hygiene
9. Deliveries and food storage (FIFO)
10. PPE, first aid, fire and gas safety
11. Daily feeding statistics (before 13:30)

## Folders
- `reference/` original PDF and slide previews (`slides/`)
- `content/` extracted text and module scripts
- `app/` web app source, also wrapped with Capacitor for Android and iOS

## Apps

The GitHub Pages site stays a static build under `/nsnp-learning-app/`. The same code installs as **NSNP Learning** (`za.co.superimmersive.nsnp`) on Android and iOS. Progress stays in `localStorage` on the device, and the installed app works offline.

Build and signing steps, including the debug APK, the Play Console bundle, and TestFlight, are in [app/README.md](app/README.md).
