# 📱 RestaurantOS Customer Mobile App (React + Capacitor APK)

A dedicated, standalone React.js mobile dining app for restaurant customers, ready to run on web or convert into an **Android APK** using **Capacitor**.

---

## 🌟 Key Features
- **Browse & Search Menu**: Categorized dishes, Pure Veg toggle, real-time search, appetizing food cards.
- **Interactive Cart & Quick Ordering**: Slide-up bottom sheet cart, special chef instructions, 1-tap KOT dispatch.
- **Live Queue & Seating Radar**: Join digital waitlist, real-time position in line (`#2 in line`), estimated wait times, haptic vibration alerts when called.
- **My Table & Running Bill**: View placed dishes, live preparation status, running subtotal & taxes.
- **1-Tap Waiter Call (Service Bell)**: Instant requests for *Water Refill*, *Call Server*, *Extra Cutlery*, *Request Check*.
- **Native Android APK Ready**: Uses Capacitor for native status bars, haptics, and Gradle APK builds.

---

## 🚀 1. Running Locally in Browser (Dev Mode)

```bash
cd customer-app
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## 📲 2. How to Build & Generate the Android APK

### Prerequisites:
- [Android Studio](https://developer.android.com/studio) installed with Android SDK & Java JDK.

### Method A: 1-Click Android Studio Build (Recommended)
1. Build the production React bundle and sync native assets:
   ```bash
   cd customer-app
   npm run cap:sync
   ```
2. Open the project in Android Studio:
   ```bash
   npm run cap:open
   ```
3. In Android Studio:
   - Go to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
   - Once completed, click **locate** in the popup to find `app-debug.apk` ready to install on any Android phone!

---

### Method B: Build APK via Terminal (CLI)
Run from the `customer-app` folder:
```bash
npm run build
npx cap sync
cd android
./gradlew assembleDebug
```
Your compiled APK will be created at:
`customer-app/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🌐 3. Connecting to the Backend Server via `.env`

You can directly configure your live restaurant link in `customer-app/.env`:

```env
# Paste your direct restaurant link or API URL:
VITE_API_URL=https://restaurant-os-bay.vercel.app/the-golden-spoon
```

The app will **automatically**:
- Extract `https://restaurant-os-bay.vercel.app` as the backend API host.
- Extract `the-golden-spoon` as the default restaurant slug.
- Connect directly on app launch without needing manual URL typing.
