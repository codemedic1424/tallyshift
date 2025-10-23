

# 📱 TallyShift

Multi-platform project for **TallyShift** — combining a Next.js web application and a SwiftUI iOS app.

---

## 📂 Repo Layout
```
apps/
 ├─ web/     → Next.js web app
 ├─ ios/     → SwiftUI iPhone app
packages/   → Shared code / design tokens
```

---

## 🧭 Getting Started

### 🌐 Web App
```bash
cd apps/web
npm install
npm run dev
```

### 📱 iOS App
Open `apps/ios/TallyShift.xcodeproj` in Xcode  
or open `TallyShift.xcworkspace` at the repo root.

---

## 🧰 Tech Stack
- **Web:** Next.js + Supabase
- **iOS:** SwiftUI + SwiftData (in progress)
- **Shared:** TypeScript + Swift Packages (planned)

---

## 🧑‍💻 Contributing
1. Branch off `app_dev`
2. Keep platform-specific work in its folder (`apps/web` or `apps/ios`)
3. Submit pull requests for review

---

## 🪶 Notes
- The iOS app is currently under development (Phase 2 – SwiftUI Fundamentals).
- The web app is live under `apps/web/`.
- `packages/` will later store shared logic, tokens, and build scripts.

---

© 2025 Christopher Wilshusen. All rights reserved.
