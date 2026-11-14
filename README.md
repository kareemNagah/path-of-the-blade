# Path of the Blade: APK build

1. Create a new GitHub repository (private is fine) and upload all files in this folder (keep the `.github` folder).
2. Open the repo's **Actions** tab, pick **Build APK**, and press **Run workflow**. It also runs on every push to `main`.
3. When it finishes (about 5–8 minutes), open the run and download **path-of-the-blade-apk** from Artifacts. It's a zip containing `app-debug.apk`.
4. Send the APK to your phone, open it, and allow "install unknown apps" for your file manager or browser when Android asks.
5. To update the app later, replace `www/index.html` and push again. Progress is stored on the phone and survives updates as long as you don't uninstall the app.
