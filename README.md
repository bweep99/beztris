# Beztris

**Beztris** is an open-source, rotary-optimized puzzle game for legacy Samsung Tizen smartwatches (Galaxy Watch 3, Gear S3, and Active series). 

While Samsung has officially ended support for the Tizen ecosystem, this project aims to preserve the classic "Bestris" experience for those still using these iconic circular displays in 2026 and beyond.

---

## 🎮 How to Play

The game is designed for one-handed play using the **Physical/Digital Rotary Bezel** and specific touch zones:

| Zone | Action |
| :--- | :--- |
| **Bezel Rotate** | Move Piece Left / Right |
| **Entire Left Side** | Rotate Counter-Clockwise |
| **Bottom Right** | Rotate Clockwise |
| **Top Right** | Hold Piece |
| **Bottom Center** | Hard Drop |
| **Pause Button** | Open Menu |

---

## 📥 Installation (The 2026 "No-Certificate" Bypass)

Standard sideloading via Tizen Studio usually fails with `Error [-27]` because Samsung's certificate servers are defunct. This method "smuggles" the game inside a trusted Android companion app, bypassing the need for developer certificates or watch debugging.

### Tools Required:
1.  **[Beztris.wgt](https://github.com/YOUR_USERNAME/beztris/releases)** (The game file from this repo).
2.  **WatcherManager++ 1.5.1.apk** (The carrier app).
3.  **APK Editor Studio** (For Windows or Mac).

### Installation Steps (Credit: [XDA Forums](https://xdaforums.com/t/guide-install-tizen-apps-watchfaces-on-galaxy-watch-3-in-2026-without-certificates.4789347/)):

1.  **Modify the Carrier APK:**
    *   Open `WatcherManager++ 1.5.1.apk` in **APK Editor Studio**.
    *   Click **Open Content** and navigate to the `assets` folder.
    *   Delete the existing `watcher.wgt` and replace it with your downloaded **`Beztris.wgt`**.
    *   **Crucial:** Set the `targetSdkVersion` to **30** in the APK settings to ensure it runs on modern Android versions (Android 11-16+).
2.  **Build & Install on Phone:**
    *   Click **Rebuild APK** and save the new file.
    *   Transfer and install this modified APK on your Android phone. 
    *   *Note: If prompted by Play Protect, choose "Install anyway."*
3.  **Sync to Watch:**
    *   Ensure your watch is connected to your phone via the Galaxy Wearable app.
    *   Open the newly installed **WatcherManager** app on your phone.
    *   The app will automatically push **Beztris** to your watch. **No "Developer Mode" or "Debugging" is required on the watch for this method!**

---

## 🛠️ Credits & Acknowledgments

- **Vibe Coding:** This project was realized through the power of **"Vibe Coding"**(ilysm ai studio).
- **maximus7maximus (4PDA):** For discovering the APK-smuggling workaround to bypass Tizen's dead certificate servers.
- **XDA Developers:** For documenting the modern 2026 sideloading workflow.
- **Jens-Gervais:** For the [Blockso](https://github.com/Jens-Gervais/Blockso) project, which provided the foundation for the game's logic.

---

## 📱 Compatibility

- **Watch OS:** Tizen 4.0 / 5.5 (Galaxy Watch 3, Active 1 & 2, Gear S2, Gear S3, Gear Sport).
- **Phone OS:** Android 11 through Android 16+.
- **Note:** This app is **not** compatible with WearOS watches (Galaxy Watch 4 and newer).

---

## ⚖️ Disclaimer

**Beztris** is a non-commercial, open-source fan project.
- Not affiliated with or endorsed by **The Tetris Company**.
- This project is purely for educational purposes and the preservation of legacy smartwatch software.

## 📄 License

This project is licensed under the **MIT License**. Feel free to fork, modify, and improve!
