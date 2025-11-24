# TallyShift iOS – Beginner-Friendly Roadmap (Chris)

This roadmap only includes tasks that match my current SwiftUI level:
- I understand `struct` views, `@State`, `@EnvironmentObject`, and basic navigation.
- I have a working sign-in screen UI and a simple `AuthViewModel`.
- I have not formally learned MVVM, data persistence, or complex networking yet.

---

## Phase 1 – Core Auth Flow (UI + Simple State)

### 1.1 Auth State Wiring
- [ ] Ensure `AuthViewModel` lives in its own file (`AuthViewModel.swift`).
- [ ] Confirm `AuthViewModel` has:
  - [ ] `@Published var isAuthenticated: Bool = false`
  - [ ] `@Published var email: String = ""`
  - [ ] `@Published var password: String = ""`
  - [ ] `func signIn()` that sets `isAuthenticated = true` when email & password are non-empty.
  - [ ] `func signOut()` that resets `isAuthenticated`, `email`, and `password`.

### 1.2 App Entry + Environment Object
- [ ] In `TallyShiftApp.swift`, create `@StateObject private var auth = AuthViewModel()`.
- [ ] Wrap the root view in a `NavigationStack { ContentView() }`.
- [ ] Attach `.environmentObject(auth)` to the root so all child views can access it.
- [ ] Build (⌘B) and confirm no `EnvironmentObject` errors.

### 1.3 ContentView Screen Switching
- [ ] In `ContentView.swift`, inject `@EnvironmentObject var auth: AuthViewModel`.
- [ ] Show the correct screen based on auth state:
  - [ ] If `auth.isAuthenticated == false`, show the sign-in screen (e.g., `SignInView2()`).
  - [ ] If `auth.isAuthenticated == true`, show a placeholder dashboard view (e.g., `Text("Dashboard")`).
- [ ] Add a simple "Sign Out" button on the dashboard that calls `auth.signOut()`.

---

## Phase 2 – Sign-In Screen Polish (Your Existing UI)

### 2.1 Local State + Validation
- [ ] Use local `@State` for username/email and password in the sign-in view.
- [ ] On tap of "Sign In":
  - [ ] Copy local `email`/`password` into `auth.email`/`auth.password`.
  - [ ] Call `auth.signIn()`.
- [ ] Disable the Sign In button when local `email` or `password` is empty.
- [ ] Optionally show a friendly error message when fields are empty and Sign In is tapped.

### 2.2 Keyboard & Focus Behavior
- [ ] Use `@FocusState` to manage which field is active.
- [ ] Make Return move focus from Username → Password.
- [ ] When Return is pressed on Password, trigger the same sign-in logic as the button.

### 2.3 Preview Stability
- [ ] Add a `#Preview` for the sign-in view that injects `AuthViewModel()`:
  - [ ] `SignInView2().environmentObject(AuthViewModel())`
- [ ] Ensure previews build and show the sign-in UI without runtime errors.

---

## Phase 3 – Dashboard (Mock Data Only)

### 3.1 Basic Dashboard Layout
- [ ] Create `DashboardView.swift`.
- [ ] Add a title/header (e.g., "TallyShift").
- [ ] Add a vertical stack of "cards" to represent:
  - [ ] Today’s shift summary (mock data).
  - [ ] This week’s hours (mock data).
  - [ ] Next upcoming shift (mock data).
- [ ] Wrap dashboard content in a `ScrollView` to handle smaller screens.

### 3.2 Navigation Structure
- [ ] Use a `NavigationStack` around `DashboardView` in `ContentView`.
- [ ] Add `NavigationLink`s in the dashboard to:
  - [ ] A placeholder "Profile" view.
  - [ ] A placeholder "Shifts" list view.
  - [ ] A placeholder "Settings" view.

### 3.3 Simple Mock Data Models
- [ ] Create a simple `Shift` struct (local-only for now):
  - [ ] `struct Shift: Identifiable { let id = UUID(); let date: String; let hours: Double }`
- [ ] Build a hard-coded array of `Shift` items in `ShiftsView`.
- [ ] Display them in a `List` with date and hours.

---

## Phase 4 – Profile & Settings (Local-Only)

### 4.1 Profile View
- [ ] Create `ProfileView.swift`.
- [ ] Display:
  - [ ] The user’s email from `auth.email`.
  - [ ] A placeholder avatar (system image).
- [ ] Add a "Sign Out" button that calls `auth.signOut()` and returns to the sign-in screen.

### 4.2 Settings View
- [ ] Create `SettingsView.swift`.
- [ ] Add a `Form` with:
  - [ ] A Toggle for “Dark Mode” (local-only, no real theme switching yet).
  - [ ] A placeholder toggle for “Show Demo Data”.
- [ ] Store toggle values in `@State` or, optionally, `@AppStorage` for persistence.

---

## Phase 5 – Code Organization & Cleanup

### 5.1 Folder / Group Structure
- [ ] Create Xcode groups:
  - [ ] `ViewModels/` (AuthViewModel)
  - [ ] `Views/Auth/` (SignIn views)
  - [ ] `Views/Dashboard/` (Dashboard, ShiftsView, ProfileView)
  - [ ] `Views/Settings/` (SettingsView)
- [ ] Ensure each file has the correct Target Membership checked.

### 5.2 Naming & Consistency
- [ ] Standardize on one sign-in view name (e.g., `SignInView2` or `SignInView`) and update references.
- [ ] Standardize on `isAuthenticated` as the single source of truth for auth state.
- [ ] Remove commented-out or unused experimental code once you’re confident.

---

## Parking Lot – Future Tasks (Not for Right Now)

These are **intentionally parked** for when I’ve learned more:

- [ ] Replace placeholder `signIn()` logic with real Supabase authentication.
- [ ] Fetch real shifts data from Supabase and replace mock `Shift` array.
- [ ] Add persistent user session handling (remember login between app launches).
- [ ] Implement profile editing (name, avatar upload).
- [ ] Add calendar-based shift browsing.
- [ ] Add notifications for upcoming shifts.

---
