# Shaping Stampy loyalty cards with Google Wallet fields

**You customize a Google Wallet loyalty card by splitting settings between two resources: the LoyaltyClass (one per venue program: branding, colors, layout, shared text) and the LoyaltyObject (one per customer card: stamp count, barcode, per-person text).** Only five class fields are required (`id`, `issuerName`, `programName`, `programLogo`, `reviewStatus`) and only three object fields (`id`, `classId`, `state`) ([LoyaltyClass](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyclass), [LoyaltyObject](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject)). Everything else is optional polish. The most important design facts for a stamp card: there is no native "stamp grid" widget, so progress must be shown with `loyaltyPoints` (for example `3/10`), text modules, and/or a per-object `heroImage` that you swap on every confirmed stamp (an inference, not an official pattern; it needs a test). Text and image modules from class and object are shown together, not overridden. Visual limits are tight (field data under 15 characters, labels under 20), and the official hero image size changed to 1032x812 px. Several documents disagree with each other (appLinkData precedence, text module counts, number of card rows, notify enum value); these are flagged below with UNVERIFIED. All facts were fetched 2026-10-30 through a summarizing tool, so re-check anything critical on the source page. No secrets are included.

Sources used: class [LoyaltyClass](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyclass), object [LoyaltyObject](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject), [Template guide](https://developers.google.com/wallet/retail/loyalty-cards/resources/template), [ClassTemplateInfo](https://developers.google.com/wallet/reference/rest/v1/ClassTemplateInfo), [Brand guidelines](https://developers.google.com/wallet/retail/loyalty-cards/resources/brand-guidelines), [Updates guide](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/updates), [Push notifications](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications), plus reference types under `https://developers.google.com/wallet/reference/rest/v1/` (Barcode, BarcodeType, State, TextModuleData, Message, GroupingInfo, RotatingBarcode, PassConstraints, AppLinkData, CallbackOptions). One non-official source: [PassKit](https://help.passkit.com/en/articles/16195826-updating-your-pass-for-the-new-google-wallet-design) (labeled where used).

## Class versus object: who owns what

The **class is the shared template** and the **object is one customer's instance** that points to it through `classId`. Updating a class affects every holder; updating an object affects only that holder ([Updates guide](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/updates)). Overrides are not general. Text modules, link modules and messages from the class and the object are displayed together (additive). Image modules show at most one from each level. The exception is `heroImage`: if the object has none, the class hero is used ([LoyaltyObject](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject)). Layout (`classTemplateInfo`) exists only on the class, so one venue has one layout for all its cards. A class must be approved before objects can be created from it; the class `reviewStatus` can be set to `draft` or `underReview`, never back to `draft`, and the platform sets `approved`. When editing an already approved class, keep sending `underReview` ([LoyaltyClass](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyclass)). UNVERIFIED: whether editing an approved class triggers a re-review that blocks objects, and which class fields propagate to existing objects (the `classReference` copy returned on GET suggests inheritance).

Two caveats on the docs themselves. First, the default module limits conflict: the class and object pages say up to 10 text modules from each level, the template guide says 20 + 20, and the brand guidelines suggest only two in total ([Template guide](https://developers.google.com/wallet/retail/loyalty-cards/resources/template), [Brand guidelines](https://developers.google.com/wallet/retail/loyalty-cards/resources/brand-guidelines)). Plan for 2 to 3 and treat anything above as UNVERIFIED. Second, `appLinkData` is contradictory (see the links table).

## Field reference by group

### Identity and lifecycle

| Field | Level | What it is / how it is used | What it changes on the card | Example | Limits |
|---|---|---|---|---|---|
| `id` | Class, Object | Unique id `issuerID.identifier`. | Invisible; used by API and JWT. | `3388.cafe-roma-class` | Alphanumerics, `.`, `_`, `-` only. Immutability not documented (UNVERIFIED). |
| `classId` | Object (required) | Points the object to its class. | Decides which branding/layout the card inherits. | `3388.cafe-roma-class` | Class must exist, be approved, match the type. |
| `reviewStatus` | Class (required) | Review lifecycle: `draft`, `underReview`, platform sets `approved`. `review` holds platform comments. | Draft classes cannot create objects. | `underReview` | Cannot go back to `draft`. Casing differs between the reference (`underReview`) and Stampy's code (`UNDER_REVIEW`); check which the API accepts (UNVERIFIED). |
| `state` | Object (required) | `ACTIVE`, `COMPLETED`, `EXPIRED`, `INACTIVE`, `STATE_UNSPECIFIED`. | Inactive objects move to "Expired passes". | `ACTIVE` | `EXPIRED` happens automatically after `validTimeInterval`. |
| `validTimeInterval` | Object | Start/end of validity. | State turns expired after the end. | end = 2027-12-31 | Fits Stampy's lazy expiry only if kept in sync (design decision, not a doc fact). |
| `issuerName` | Class (required) | Merchant name. `localizedIssuerName` for translations. | Header text near the logo. | `Caffe Roma` | Recommended 20 chars. |
| `programName` | Class (required) | Name of the loyalty program. `localizedProgramName`. | Card title, fixed (cannot be moved by templates). | `Coffee Card` | May be truncated after 20 chars. Changing it can trigger a push (allowlist). |
| `countryCode` | Class | Country for display and fallback localization. | Localization only. | `IT` | None stated. |
| `accountId` / `accountName` | Object | Member id and member name. | Shown in the details; labelled by the class labels below. | `A1B2` / `Mario R.` | Recommended 20 chars each. Do not put personal data in logs. |
| `accountIdLabel` / `accountNameLabel` | Class | Captions for the two fields above. `localized...` variants. | Changes the label text. | `Member ID` | Recommended 15 chars. |
| `groupingInfo` | Object | `groupingId` visually groups passes; `sortIndex` orders them (lower first, unset = INT_MAX). | Several cards of a customer stack together. | `groupingId: "stampy"` | Ties in sortIndex undefined. |
| `multipleDevicesAndHoldersAllowedStatus` | Class | `MULTIPLE_HOLDERS`, `ONE_USER_ALL_DEVICES`, `ONE_USER_ONE_DEVICE` (restricted, contact support), `STATUS_UNSPECIFIED`. | Whether the same card can be saved by several people/devices. | `ONE_USER_ALL_DEVICES` | `allowMultipleUsersPerObject` deprecated. |
| `hasUsers`, `hasLinkedDevice` | Object | Platform-set flags. | Nothing; read-only signals. | | Not for writing. |
| `classReference` | Object | The class copy returned on GET. | Nothing. | | GET only. |
| `kind`, `version`, `wordMark`, `infoModuleData`, `locations[]` | Class | Deprecated. | Do not use. | | Use `textModulesData` and `merchantLocations[]` instead. |

### Branding and images

| Field | Level | What it is / what it changes | Example | Limits and specs |
|---|---|---|---|---|
| `programLogo` (required) | Class | Square logo; shown in details and list views, circular-masked by Wallet. | Venue logo PNG | PNG, 1:1, min 660x660, do not pre-mask, full-bleed square background, content inside the 840x840 safe area (15% margin) on a 1000 px canvas ([Brand guidelines](https://developers.google.com/wallet/retail/loyalty-cards/resources/brand-guidelines)). |
| `wideProgramLogo` | Class | If set, replaces `programLogo` (and on Android the issuer-name header) at the top-left of the card view. | Wordmark | Transparent PNG, recommended 1280x400 (16:5), min height 400; light on dark backgrounds, dark on light. |
| `heroImage` | Class, Object | Banner on the card front, displayed at 100% width. Object falls back to class. If none is supplied Wallet shows a category fallback image. | Stamp grid picture | Official guide: PNG, 1032x812 px (about 5:4), 20dp top/bottom padding, no embedded text (not localized), no thin rectangles. Older spec was 1032x336 ([PassKit, non-official](https://help.passkit.com/en/articles/16195826-updating-your-pass-for-the-new-google-wallet-design)); how old clients crop the new size is UNVERIFIED. |
| `imageModulesData[]` | Class, Object | Extra images below the hero (`mainImage`); also usable in template slots. | Promo banner | At most 1 shown per level. PNG, wide, min width 1860 px, no squares. Images above barcode: 80 px tall (single 1600x80, two side by side 80-780 wide); below barcode 80 px tall, 80-1600 wide. |
| `Image.sourceUri.uri` | all images | The URL of the image. | `https://cdn.example.com/hero-3.png` | "Must have a scheme". Public HTTPS requirement, max file size, formats beyond PNG, caching and refresh speed are not stated: UNVERIFIED. |

### Colors

| Field | Level | What it is / what it changes | Example | Limits |
|---|---|---|---|---|
| `hexBackgroundColor` | Class | Card background, `#rrggbb` or `#rgb`. If unset, Wallet uses the dominant color of the hero, then of the logo. | `#1a1a1a` | Avoid highly saturated neon. Guideline palette examples: #1a1a1a, #e8eaed, #d6322d, #216acf, #1e7e3b. Not documented on the object (class-level only). No numeric contrast rule or automatic text-color rule found: UNVERIFIED. Dark-mode behavior not found: UNVERIFIED. |

### Points and tier (where stamp progress lives)

| Field | Level | What it is / what it changes | Example | Limits |
|---|---|---|---|---|
| `loyaltyPoints` | Object | Primary points block: `label`, `balance` (exactly one of `string`, `int`, `double`, `money`), `localizedLabel`. Shown prominently on the card. | label `Stamps`, balance string `3/10` | Label recommended 9 chars, balance 7 chars. Use `string` for "3/10" or `int` for 3. Changing `balance` is a push-allowlisted update. |
| `secondaryLoyaltyPoints` | Object | A second block next to the first. | label `Rewards`, balance `1` | Same limits. Also allowlisted for push. |
| `rewardsTierLabel` / `rewardsTier` | Class | Tier caption and value. | `Level` / `Gold` | Recommended 9 / 7 chars. Changing `rewardsTier` is push-allowlisted. |
| `secondaryRewardsTierLabel` / `secondaryRewardsTier` | Class | Second tier pair. | | No limit stated. |

### Text modules

| Field | Level | What it is / what it changes | Example | Limits |
|---|---|---|---|---|
| `textModulesData[]` | Class, Object | Header + body blocks on the pass details; class and object both show. | `{id:"rule", header:"How it works", body:"10 stamps = 1 free coffee"}` | Header recommended 35 chars, body 500 chars (multiple bodies are concatenated). `id`: alphanumerics, `_`, `-`; no dots. Counts: 10+10 (reference), 20+20 (template guide), 2 (brand guidelines): conflict, UNVERIFIED. `localizedHeader/Body` exist. |
| `infoModuleData` | Class | Deprecated. | | Use text modules. |

### Links, apps and locations

| Field | Level | What it is / what it changes | Example | Limits |
|---|---|---|---|---|
| `linksModuleData` | Class, Object | Grouped links (maps, phone, email, web); both levels show. | Website, phone | Template guide: unlimited. Schema (Uri) not fetched: UNVERIFIED. |
| `homepageUri` | Class | Same as a homepage link in links module. | `https://cafe.example` | |
| `appLinkData` | Class, Object | Button on the card front to an app or website: `androidAppLinkInfo`, `webAppLinkInfo`, `displayText`. | "Order online" | Display text 30 chars. `iosAppLinkInfo` deprecated. CONFLICT: the class page says object-level takes precedence; the object page says the object value is not displayed if the class defines one. UNVERIFIED which is right; define it on one level only. |
| `merchantLocations[]` | Class, Object | Places that trigger a lock-screen notification within a Google-set radius. | Shop coordinates | Max 10 on class and on object. Replaces deprecated `locations[]`. |
| `discoverableProgram` | Class | Sign-up/sign-in discovery inside the Google Pay app (`merchantSignupInfo`, `merchantSigninInfo`, `state`: `TRUSTED_TESTERS`, `LIVE`, `DISABLED`). | | Not needed for the MVP. |
| `valueAddedModuleData[]` | Class, Object | Extra value-added modules. | | Max 10 on each; schema not fetched: UNVERIFIED. |
| `linkedOfferIds[]`, `linkedObjectIds[]` | Object | Link to other objects of the same issuer. | | Cannot be unlinked; excess silently ignored. |

### Barcode and security

| Field | Level | What it is / what it changes | Example | Limits |
|---|---|---|---|---|
| `barcode` | Object | Code shown on the card: `type`, `value`, `alternateText`, `renderEncoding`, `showCodeText`. | `QR_CODE`, value = public code | Types: `AZTEC`, `CODE_39`, `CODE_128`, `CODABAR`, `DATA_MATRIX`, `EAN_8`, `EAN_13`, `ITF_14`, `PDF_417`, `QR_CODE`, `UPC_A`, `TEXT_ONLY`. `renderEncoding` `UTF_8` works only with `QR_CODE`. `alternateText` not allowed with `TEXT_ONLY`. No official "which type when" guidance: UNVERIFIED beyond these facts. |
| `rotatingBarcode` | Object | Barcode that changes over time via TOTP. | | Only `QR_CODE` and `PDF_417`. Probably over-engineering for the MVP (opinion). |
| `viewUnlockRequirement` | Class | `UNLOCK_NOT_REQUIRED` (default) or `UNLOCK_REQUIRED_TO_VIEW`. | | Requires a device lock. |
| `securityAnimation` | Class | `FOIL_SHIMMER` animation on the details to show the pass is live. | | |
| `passConstraints` | Object | `screenshotEligibility` (`ELIGIBLE` default, `INELIGIBLE` blocks on Android), `nfcConstraint[]`. | | Older Wallet versions may still allow screenshots. |
| `saveRestrictions` | Object | Conditions checked only at save time. | | Schema not fetched: UNVERIFIED. |
| `multipleDevicesAndHoldersAllowedStatus` | Class | See identity table. | | |
| `enableSmartTap`, `redemptionIssuers[]`, `smartTapRedemptionValue` | Class / Object | NFC redemption by partner terminals. | | Needs Smart Tap keys; ASCII only. Stampy does not need it (confirmation is by staff in a web app). |
| `callbackOptions` | Class | HTTPS URL that Google calls on every user save or delete. | `https://api.example/wallet/cb` | robots.txt must allow Googlebot; best-effort delivery with possible duplicates (callback pages read through search summary: UNVERIFIED). |

### Layout templates (classTemplateInfo, class-level only)

| Part | What it controls | How it is used | Limits |
|---|---|---|---|
| `cardTemplateOverride.cardRowTemplateInfos[]` | Rows on the card front under the fixed title. | Each row is `oneItem`, `twoItems` or `threeItems`; each item picks a field via `firstValue.fields[].fieldPath` (optional `secondValue` renders "A / B"). | Rows: reference says at most 3, template guide says at least 1 and recommended at most 2 (conflict). Brand guideline says max two fields per row, up to three rows. Hero is placed after the first row when there are several rows, above it when there is one. |
| `cardBarcodeSectionDetails` | Items around the barcode. | `firstTopDetail`, `secondTopDetail` (side by side above), `firstBottomDetail`; text or image. | |
| `detailsTemplateOverride.detailsItemInfos[]` | Ordered items in the details section. | Images render full width, without label. | |
| `listTemplateOverride` | Pass list (wallet home). | `firstRowOption`, `secondRowOption` (hidden when the pass is in a group); third row deprecated. No labels. | |
| `fieldPath` syntax | Which data fills a slot. | Prefix `object.` or `class.`; reference modules by `id`, e.g. `class.textModulesData['rule']` (preferred) or index. First non-empty field wins; do not mix types; use a placeholder such as `-` to always show. | `object.loyaltyPoints.balance.int` as a path is UNVERIFIED (not in the fetched pages); confirm in the template field list. Per-item character limits not documented. |
| Behavior | | Empty item hidden; all-empty row hidden; partly empty row re-flowed. Labels are Google-provided, some overridable with `class.custom<Name>Label` plus translations. | |

Example pattern from the template guide (composed by analogy, path UNVERIFIED):
`{"classTemplateInfo":{"cardTemplateOverride":{"cardRowTemplateInfos":[{"twoItems":{"startItem":{"firstValue":{"fields":[{"fieldPath":"object.loyaltyPoints.balance.int"}]}},"endItem":{"firstValue":{"fields":[{"fieldPath":"class.textModulesData['rule']"}]}}}}]}}}`

### Messages, notifications and updates

| Field / call | Level | What it does | Limits |
|---|---|---|---|
| `messages[]` | Class, Object | Messages kept on the back of the pass. `header`, `body`, `displayInterval`, `id`, `messageType` (`TEXT` default, `TEXT_AND_NOTIFY`, `EXPIRATION_NOTIFICATION` not supported). | Max 10 (reference); template guide says 20+20. No character limits stated; notification title under 29, collapsed body under 40, expanded under 80 per brand guidelines. |
| `addMessage` | Object call | POST `.../loyaltyObject/{id}/addMessage`; with `TEXT_AND_NOTIFY` it also sends a push. | At most 3 push-triggering messages or updates per 24 hours (per pass according to the summary); exceeding gives `QuotaExceededException`; the user needs notifications enabled ([Push guide](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications)). |
| `notifyPreference` | Class, Object | Ephemeral: must be sent with each PATCH/UPDATE; notifies only if an allowlisted field changed. | Allowlist: `loyaltyPoints.balance`, `secondaryLoyaltyPoints.balance` (object); `rewardsTier`, `secondaryRewardsTier`, `programName` (class). Value conflict: guide says `notifyOnUpdate`, reference says `NOTIFY` (enum `NotificationSettingsForUpdates`); test which the API accepts (UNVERIFIED). |
| PATCH / PUT object | Object | `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{id}`, scope `https://www.googleapis.com/auth/wallet_object.issuer`, service account with "Developer" access ([patch](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject/patch), [auth](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/auth/rest)). | Array and nested merge semantics undocumented: send the full `textModulesData` array every time, keep progress text and `loyaltyPoints.balance` consistent. Whether PUT requires the full object: UNVERIFIED. Update propagation latency: not found. |
| `disableExpirationNotification` | Object | Currently only settable for offers. | Not applicable to loyalty. |

## Visual design guidance and the stamp-display problem

The brand guidelines favor a roughly square hero, so a stamp grid designed at **1032x812 px PNG** with **20dp padding top and bottom** fits the current layout. The guidelines forbid embedded text in the hero because it is not localized, which conflicts with drawing numbers in a stamp image; keep numbers in `loyaltyPoints` and text modules instead. The logo should be a full-bleed square at least 660x660 with content inside the central 840/1000 area (inference: about 560 px for a 660 px image), matching the square-logo item already in Stampy's backlog. Keep the background color a deliberate brand color rather than relying on automatic extraction, avoid neon, and pick a hero background that blends with `hexBackgroundColor` to avoid visible seams (opinion). Button assets for "Add to Google Wallet" must be Google's own, minimum 48dp high with 8dp clear space.

For progress, the API supports the pattern: pre-render N+1 hero PNGs (0 to N stamps) at stable HTTPS URLs, and PATCH the object's `heroImage.sourceUri` on each confirmed stamp together with `loyaltyPoints` and the progress text. This is an inference; no official stamp-card example was found. Unknowns to test on a demo object: how fast clients refresh a changed image, whether the URL must change to bypass caching, and how clients crop the hero. Demo mode limits (test users only) and branding review criteria could not be retrieved because the pages returned 404 ([issuer onboarding](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/issuer-onboarding) was read via summary): UNVERIFIED.

## Suggested configuration for Stampy stamp cards

The current backend sends the class and object in a save-to-wallet JWT and already uses `QR_CODE` with the public code, `loyaltyPoints` label `Timbri` with `int` balance, and text modules `reward_info`, `stamps_info`, `user_progress` (note: the class there uses `UNDER_REVIEW`; verify casing). The suggestion below builds on that and stays inside the documented limits.

| Group | Suggested value | Reason |
|---|---|---|
| Class identity | `issuerName` = venue name (max 20), `programName` = short program name (max 20), `countryCode` = `IT` | Avoid truncation. |
| Class branding | `programLogo` 660x660+ square PNG; optional `wideProgramLogo` 1280x400 only if the venue has a good wordmark; `heroImage` 1032x812 default "0 stamps" | Matches brand guidelines. |
| Class color | `hexBackgroundColor` explicit, non-neon, matched to hero | Do not rely on dominant color. |
| Object points | `loyaltyPoints` = label `Stamps` (or the Italian `Timbri`, 6 chars), balance string `3/10` (4 chars) | Within 9/7 chars; one glance progress. Switching from `int` to `string` is a code change to decide. |
| Object secondary | `secondaryLoyaltyPoints` = `Rewards` with count of available rewards | Full card = reward available. |
| Object hero | Optional per-object `heroImage` for stamp count N, patched after each confirmed stamp | Visual progress; needs test (UNVERIFIED). |
| Text modules | Class: `rule` ("10 stamps = 1 free coffee", header under 35 chars). Object: `user_progress`. Keep at most 3 total | Brand guideline says 2; limits conflict. |
| Links | Venue website/phone/maps in `linksModuleData`; skip `appLinkData` (Stampy has no app and the precedence is contradictory) | Avoids the conflict. |
| Barcode | `QR_CODE`, `value` = public code, no `rotatingBarcode`, no Smart Tap | Simple; staff scan or confirm in web app. |
| Layout | Optional `cardTemplateOverride` with one `twoItems` row: stamps balance and rule; keep rows at 2 or fewer | Within the stricter template recommendation; field path UNVERIFIED. |
| Notifications | `notifyPreference` only at reward reached; plain updates for the other stamps; `TEXT` messages by default | The cap is 3 push-triggering events per 24 hours. |
| State | `ACTIVE`; set `INACTIVE` or expired when the card ends | Moves the pass to "Expired passes". |
| Security | `UNLOCK_NOT_REQUIRED`; optionally `screenshotEligibility: INELIGIBLE` | A stamp card is low risk; screenshots of a QR are blockable only on Android. |
| Callbacks | Set `callbackOptions.url` to learn about saves/deletes (HTTPS, idempotent handler, verify signature) | The only documented signal that a user added or removed the pass. |

## Conclusion

The real constraint is not the number of fields but the lack of a stamp-specific primitive: Google gives one visual slot (the hero) and short text slots (9 and 7 characters for points), so a good Stampy card is a disciplined composition of a swapped hero image, a compact `3/10` balance and one rule text, with class-level branding set once per venue. The documentation also disagrees with itself on several limits, which makes a demo-object test pass (module counts, row counts, `notifyPreference` value, PATCH array behavior, hero refresh and cropping, `appLinkData` precedence) a cheap prerequisite before building the UI around any of them.

Not verified and worth checking before implementation: schemas of Image, LinksModuleData/Uri, ImageModuleData, MerchantLocation, SaveRestrictions, ValueAddedModuleData and Review; demo-mode and branding review rules; dark-mode and truncation behavior; image hosting requirements; request quotas and error codes. Fetch date for all findings: 2026-10-30.
