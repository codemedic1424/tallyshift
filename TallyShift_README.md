# TallyShift

**Unified Dispatch Quality Assurance & Analytics Platform**

TallyShift integrates emergency dispatch quality assurance, reporting, and analytics into a single cross-platform solution built with **SwiftUI** for iOS and **Next.js / Supabase** for web.

---

## 🧭 Vision

TallyShift empowers dispatch and QA/QI teams to:
- Review, analyze, and improve call performance in real time.
- Access QA data seamlessly from both iOS and web.
- Streamline workflow between Quality Assurance, Dispatch Review, and Training.

---

## 👥 Team

| Role | Name | Focus |
|------|------|--------|
| iOS Developer | **Christopher Wilshusen** | SwiftUI, SwiftData, app architecture, iOS interface |
| Web Developer | **Logan [Last Name]** | Next.js, Supabase, API integration, web dashboard |

---

## 📦 Repository Structure

```
TallyShift/
├── apps/
│   ├── ios/         # iOS app (SwiftUI)
│   └── web/         # Web app (Next.js + Supabase)
├── packages/        # Shared code and models (future)
├── README.md        # This file
└── .gitignore
```

---

## ⚙️ Environment Setup

| Requirement | Version | Purpose |
|--------------|----------|----------|
| Node.js | ≥ 18 | Web development |
| Xcode | ≥ 15 | iOS development |
| Git | ≥ 2.40 | Version control |

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/codemedic1424/tallyshift.git
   cd tallyshift
   ```

2. Web setup:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

3. iOS setup:
   ```bash
   cd apps/ios/TallyShift
   open TallyShift.xcworkspace
   ```
   - Ensure you’re using the correct team and bundle identifier.
   - Run on simulator or physical device.

---

## 🚀 Current Milestones

| Area | Focus | Status |
|------|--------|--------|
| Web  | Authentication + Dashboard | ✅ Complete |
| iOS  | SwiftUI Foundations + Layout | 🔄 In Progress |
| iOS  | State, Data Flow, and Persistence | ⏳ Upcoming |
| Shared | Unified Supabase Schema | ⏳ Planned |

---

## 🧩 Shared Goals

- Maintain a consistent design system between iOS and Web.
- Share data models via Swift Packages and TypeScript definitions.
- Sync QA/QI and Analytics modules for unified insight reporting.
- Establish continuous integration pipelines for both platforms.

---

## 🧠 Development Notes

- The root of this repository is the **primary Git repository**.  
  Do **not** initialize additional Git repos inside `apps/ios` or `apps/web`.

- Branches:
  - `app_dev` – active iOS development branch.
  - `main` – stable code for both platforms.

- Tagging Convention:
  - `ios-phase2-complete`
  - `web-phase1-release`

---

## 🧾 Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Product → Clean Build Folder (⇧⌘K) |
| Canvas not loading | Editor → Canvas (toggle) |
| Missing `simctl` | `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer` |
| Nested Git repo warning | Remove with `git rm -rf --cached path/to/nested/repo` |

---

## 🔗 Planned Integration

- Shared Supabase Auth for iOS and Web
- Common model definitions between SwiftData and Supabase
- Dashboard data visualization parity (Web ↔ iOS)
- Notification sync and QA report exports

---

## 🧱 License & Attribution

Copyright © 2025  
Developed collaboratively by **Christopher Wilshusen** and **Logan [Last Name]**.  
All rights reserved.