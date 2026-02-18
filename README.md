# Syntax Crewapp 👋

## Get started

1. Install dependencies

   ```bash
   npm installhttps://forms.office.com/pages/responsepage.aspx?id=aQafE7vO30K540FQCd22kJi85W0gwmxJide-l8R1-DFUQlA5NEEwQVRENTNQSjNWUUpEODNIRk1aUC4u&route=shorturl
   ```

2. Start the app

   ```bash
   npm run start
   ```

## EAS Cloud Builds

Builds are run remotely via [EAS Build](https://docs.expo.dev/build/introduction/). Make sure you have the EAS CLI installed:

```bash
npm install -g eas-cli
eas login
```

### Android

```bash
# Development build (APK, internal distribution)
eas build --platform android --profile development

# Preview build (APK, internal distribution)
eas build --platform android --profile preview

# Production build (AAB, auto-increments version)
eas build --platform android --profile production
```

### iOS

```bash
# Development build (internal distribution)
eas build --platform ios --profile development

# Preview build (internal distribution)
eas build --platform ios --profile preview

# Production build (auto-increments version)
eas build --platform ios --profile production
```

### Submit to stores

```bash
# Submit Android production build to Google Play (internal track)
eas submit --platform android --profile production
```

## Dependencies

1. Discord OAuth via Supabase
2. Google Sheet for retreiving planned events from Syntax Google Drive
3. Supabase Edge Functions for Discord role authorization and push notification logic
4. Supabase storage for crew & volunteer task management (main feature of this app)
5. Firebase FCM for pushing notifications to Android
