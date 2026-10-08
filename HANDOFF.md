# ทัวร์โดนใจ

เว็บบริการเดินทางที่บริษัทเป็นผู้ขายเอง มีหมวดทัวร์ วีซ่า ตั๋วเครื่องบิน และตั๋วกิจกรรม

## เวอร์ชันนี้
- หน้าลูกค้า: ค้นหา กรองหมวด ประเทศ และงบประมาณ
- หน้ารายละเอียด: ข้อมูลบริการและคำขอใบเสนอราคา
- CMS: เพิ่มและแก้ไขบริการ ตั้งราคา เปิด/ปิดการแสดงรายการ
- คำขอลูกค้า: บันทึกใน D1 และเปลี่ยนสถานะงาน
- รองรับหน้าจอมือถือ

รายการและราคาทั้งหมดเป็นข้อมูลตัวอย่าง ยังไม่มีการรับชำระเงินหรือยืนยันการจองอัตโนมัติ รูปภาพเป็นไฟล์ท้องถิ่นจาก Unsplash (Tommy Silver และ Omer Nezih Gerek)

## เปิดในเครื่อง
รัน `npm run dev` แล้วเปิด URL ที่แสดงในเทอร์มินัล เข้า `/admin` เพื่อจัดการข้อมูล ฐานข้อมูลท้องถิ่นเก็บใน `.wrangler/state` ไม่ถูกอัปโหลดไปพร้อม source

หากติดตั้งใหม่: `npm install` → `npm run build` → ใช้ Wrangler รัน migration ใน `drizzle/0000_new_justin_hammer.sql` ด้วย `--local --config dist/server/wrangler.json --persist-to .wrangler/state` → `npm run dev`

## การเผยแพร่
ผู้ใช้เลือก Cloudflare โดยตรง บัญชี ff88c9a65e3a7b03c6f085ff6e4f032b และ GitHub https://github.com/painaima/tourdonjai.git ใช้ Chrome profile tourdonjai

Production config: .deployment/wrangler.production.json ผูก D1 DB และ R2 BUCKET ของบัญชีนี้ ห้ามใช้ placeholder config จาก dist/server/wrangler.json เพื่อ deploy

CMS production ตรวจ Cloudflare Access JWT ด้วย RS256, issuer, audience, expiry และอีเมล tourdonjai@gmail.com ทั้งหน้า /admin และ API การจัดการ ไม่รับ oai-authenticated-user-email แล้ว Public catalog/settings GET และ inquiry POST ยังเป็นสาธารณะ ต้องสร้าง Access application ครอบ /admin และ /admin/* พร้อม email allow policy จากนั้นเพิ่ม ACCESS_TEAM_DOMAIN และ ACCESS_AUD ใน production vars ก่อน deploy ใช้ signed CF_Authorization cookie สำหรับ API ที่แชร์กับหน้าสาธารณะ ในเครื่องยังเข้า localhost ได้

## การตรวจสอบ
ผ่าน build และ TypeScript; ทดสอบอ่านรายการ บันทึกบริการ สร้างและอ่านคำขอ เปลี่ยนสถานะ และปฏิเสธข้อมูลไม่ถูกต้องด้วยข้อมูลจำลองในฐานข้อมูลท้องถิ่น จากนั้นล้างข้อมูลทดสอบแล้ว ตรวจหน้าลูกค้าและ CMS ในเบราว์เซอร์และหน้าลูกค้าที่ความกว้าง 390px ทดสอบ WebMCP ค้นหาด้วยข้อมูลถูกต้องและไม่ถูกต้องแล้ว

## รายละเอียดทัวร์ที่เพิ่ม
โปรแกรมรายวันพร้อมอาหารและที่พัก รอบวันเดินทางพร้อมราคาต่อท่านและที่นั่ง รายการรวม/ไม่รวม เงื่อนไข และแกลเลอรีสูงสุด 30 รูป รองรับอัปโหลด JPEG PNG WebP ไปยัง R2 (BUCKET) และลิงก์ HTTPS ข้อมูลเหล่านี้แก้ไขใน CMS ได้ คำขอบันทึกรอบและราคาที่ลูกค้าเลือก ข้อมูลเริ่มต้นทั้งหมดเป็นตัวอย่าง รูปเพิ่มเติมจาก Unsplash: https://unsplash.com/photos/cCw6KQVJnyU และ https://unsplash.com/photos/5aSIRVGoB9s

## LINE OA and updated design
High-contrast navy text, white surfaces, orange search buttons, and green LINE booking buttons. Japan example gallery now contains eight distinct photos. Header, cards, and detail pages prioritize LINE booking. The dialog prepares tour/selected departure text for the customer to copy and send themselves.

The owner will provide the actual OA link later. Leave settings blank until then; configure CMS > LINE channel with the OA ID or HTTPS lin.ee/line.me link. Settings persist in D1 site_settings. Apply drizzle/0001_giant_ikaris.sql in addition to the initial migration. Unconfigured buttons display a pending-channel notice.

Additional Unsplash sources: https://unsplash.com/photos/e8-tEAIZh2U, https://unsplash.com/photos/4CMq1GxDSPA, https://unsplash.com/photos/tawcVvhXDjE, https://unsplash.com/photos/9lSNYBdgRHA, https://unsplash.com/photos/c2Z_uo7nyC0

TypeScript and production build pass. Browser verified homepage colors, eight gallery pictures, and LINE dialog. Homepage, detail, and settings API return HTTP 200. Run npm start -- --port 5173 after build and local migrations for the preview.

## Wholesale round tables, filters and automatic archive
CMS branding now reads Tour Donjai Wholesale. The round editor is a horizontally scrollable table of outbound/return dates, per-person price, total capacity, remaining seats, and per-person commission in baht. Service codes, airline names, and comma-separated activity tags can be edited for every service category.

Both storefront and CMS support country, earliest outbound date, latest return date, minimum/maximum price, and selectable activity tags. Multiple selected tags match any selected activity; dates and price must match the same round. The entire trip must fit within the requested travel interval. Dates on expired rounds do not affect current starting prices or searches.

Rounds close once their outbound date is earlier than the current business date (Asia/Baku). The departure day itself remains open. All-expired tours appear in the closed-tours route and CMS tab and leave the active list. Future sold-out rounds remain visible as full; undated tours remain inquiryable. Adding a future round reopens an archived tour. Status is evaluated on every catalog read without changing the owner's publication toggle or erasing historical data; open pages refresh catalog every minute. No unattended background job is needed.

Validation: TypeScript and production build pass. Run node tests/catalog-behavior.mjs for 17 assertions covering expiry, timezone boundary, filters, and invalid dates. Local API smoke test verified persisted commission/capacity/code/tags, closed public visibility, reopening after a future round, invalid dates/capacity rejection and closed inquiry rejection. The disposable QA record was removed. Browser checked tag filters, CMS table including commission, and archive empty state.

## Wholesale PDF trial import: HEK22 / HEK23
Read both supplied 10-page Hong Kong PDFs and imported two 3-day / 2-night Emirates programs. The source extraction contains 8 HEK22 departures (May–July 2026) and 12 HEK23 departures (July–September 2026), detailed itineraries, hotel alternatives, meals, flight variations, baggage, child/infant pricing, single supplement, deposit, payment timing, minimum group size, insurance, tip, inclusions/exclusions and terms. Original imported payload is preserved at data/wholesale-import-hek22-hek23.json.

Live remaining seats and commission were not provided by the PDFs. They are stored as null and shown as pending confirmation; the 20-seat source allocation is stored as capacity. Source supplier ITRAVEL is inferred from the source directory, flagged for confirmation. Notes also flag conflicting tax text and the annual nature of the Kwun Yum treasury-opening ritual. No future departures were invented by the importer.

Each program has the same five genuine photographs embedded in both PDFs, uploaded to local R2, with source page and caption metadata. These are unmodified source bytes, not AI-generated scenery. Two separate 16:9 branded card covers were composed using the built-in image_gen tool from three actual reference photographs. Output assets are backed up under data/wholesale-assets and the sibling imported-wholesale-assets folder. image-prompts.txt contains the prompt set. Do not label cover collages as single-location photographs.

CMS has a dedicated draft list (/admin?view=drafts), source metadata editor, and admin-only draft previews via ?preview=1. Public API scope excludes drafts; booking actions are disabled on drafts. Both were initially saved and verified unpublished. During browser QA concurrent CMS edits changed the departure schedules and publication flags. Existing schedule changes were preserved, with a review snapshot in data/wholesale-current-review-snapshot.json; source schedules remain in the original import manifest. Resolve the owner's preference before replacing those edited rounds.

Validation: TypeScript and production build pass; all program and photo fields persisted on initial import; five gallery photos plus one feature per program load; 17 catalog behavior assertions pass; draft previews and wholesale metadata were checked in-browser. Local data lives in .wrangler/state and is not included in the source ZIP. Re-upload backed-up assets to R2 and rewrite the media URLs before restoring these JSON records to another environment.

Final handoff: both publication flags were set to false after the concurrent changes, preserving all edited departure rows. The final review snapshot reflects the preserved CMS edits; the source import manifest keeps the original PDF rounds.

## Compact CMS fields
Service editor now uses four columns for short fields on desktop, two on mobile, and one on very narrow screens. Desktop controls are 36px high; mobile controls stay 44px. Longer descriptions remain full width with resizable text areas. Wholesale numeric fields use one column, text fields two, and long notes the full row. Tour extras use two columns, departure cells are narrower, and the wholesale cover preview is reduced to 240px.
Validation: TypeScript and production build pass; browser checked service, extras, wholesale (19 fields), and departure table. At 390px the form uses two columns without internal overflow and inputs are 44px high. New built preview runs at http://127.0.0.1:5174/admin; existing 5173 editor tab was preserved without reload or data writes. No deployment was performed; the previous registration attempt was blocked by Sites quota and the manifest still has no project_id.

## Project-specific GitHub and Cloudflare accounts
Repository initialized on main with HTTPS origin https://github.com/painaima/tourdonjai.git. Repository-local HTTPS credential username is painaima and credential.useHttpPath is true. Removed the previous repository-local core.sshCommand; the unused SSH key remains ignored in .deployment/ssh. No commit or push has been made; HTTPS authentication and commit email still need verification. User requests Chrome profile tourdonjai for browser-based account work; this preference does not automatically switch CLI authentication.
Cloudflare target account ff88c9a65e3a7b03c6f085ff6e4f032b is saved in .deployment/cloudflare.json. npm run cf:whoami and npm run cf -- <args> use scripts/cloudflare-account.mjs to load the project-only API token from .deployment/.env and pin the account. Empty token exits before Wrangler, without falling back to painaima OAuth. Production deploy/version commands are blocked until a proper configuration, D1/R2 migration and CMS authentication are implemented. The project Account API Token is saved in the ignored .deployment/.env and successfully verified against the selected account.

## Cloudflare migration — 2026-10-07
Created D1 tourdonjai-web-db (db4b0c9c-7046-40fb-9b20-d75b7642bd5d) and private R2 tourdonjai-web-images. Imported a consistent SQLite snapshot: catalog 2, inquiries 0, site_settings 0; remote SELECT verified catalog count 2. Existing built-in seeds remain in source. Uploaded all 7 referenced local R2 media objects with unchanged UUID keys and content types (6,302,026 bytes). Snapshot SQL, source media and checksum manifest are ignored in .deployment/migration. Do not re-import SQL blindly: future CMS changes in Cloudflare must be preserved.

workers.dev subdomain is tourdonjai (API verified). Access API still returns access.api.error.not_enabled; user must finish Zero Trust/Access activation, then create the CMS Access application and obtain AUD/team domain. API token initially had Workers/D1/R2 permissions; Access configuration may need dashboard setup or narrowly scoped additional permission. No Worker deployment, commit, or GitHub push has been performed. CMS Access configuration is now completed; see deployment verification below.

Authentication validation: node --experimental-strip-types tests/access-auth.mjs passes 9 checks (valid header/cookie, wrong email/audience/issuer, missing config, forged signature/header, expired token). Production build passes. TypeScript checked after the final typing repair.

## Cloudflare deployed — 2026-10-07
Live storefront: https://tourdonjai.tourdonjai.workers.dev
Live CMS: https://tourdonjai.tourdonjai.workers.dev/admin
Worker version: 7c37842f-7b0e-48f6-acf5-b3bfa22dfd3d

Browser directly verified Access application Tourdonjai CMS (f5b284e4-2cc5-466d-83ae-d4563e33f2ae), destination tourdonjai.tourdonjai.workers.dev/admin, Allow policy only tourdonjai@gmail.com. Team domain https://cool-salad-4a56.cloudflareaccess.com; AUD stored in production config. Current login provider is Cloudflare (not email OTP). Access API token cannot read this app's details, so empty API app listings are not authoritative; dashboard shows the configured app.

Build passed and npm run cf -- deploy deployed using the pinned production config/account/database/bucket. Wrapper permits only plain deploy and adds its own production config; publish/version paths remain blocked. Public homepage/catalog/settings return 200; public catalog currently has 10 published items. Anonymous /admin and /admin/test redirect to Access login; anonymous and forged Sites email-header inquiry reads return 403. All 7 R2 media files return 200 and their SHA256 hashes exactly match source snapshots. Browser login via existing Cloudflare session succeeded and CMS loaded all 11 services including imported HEK22 and draft HEK23. No business data was edited during verification. Screenshot: cloudflare-cms-live.jpg. No Git commit/push has been performed.

## TTK26 trial import — 2026-10-07
User requested one Turkey PDF imported into live CMS with AI gallery and sale-style cover. Saved as unpublished wholesale-ttk26, service code TTK26. Source PDF has 24 pages. Extracted text, structured payload, SQL (insert-only, no overwrite), original generation prompts and final media/checksums are in data/ttk26-import. The live D1 record was read back and exactly matched every payload field. Public catalog excludes this draft.

Mapped: 9 days / 7 nights; price 46,888 THB; 3 rounds 2026-11-26–12-04, 12-03–12-11, 12-10–12-18; 25 capacity each, remaining seats/commission null. Category tour, country Turkey, winter label and 14 activity tags. All 9 day itineraries, meals (18 included), 7 hotel nights including cave stay, baggage 30/7 kg, single supplement 12,500, infant 14,500, deposit 25,000, balance 20–25 days, minimum group 15, accident insurance 1 million THB, inclusions/exclusions, options, flights and cancellation terms mapped. Tip numeric field 1,000 THB represents tour leader only; new tipNotes retains separate guide/driver 64 USD without FX conversion. Wholesale editor now exposes tipNotes.

Source ambiguities flagged in wholesale notes: Business upgrade quoted 110,000–120,000 vs group-ticket prohibition; included VAT/WHT vs excluded taxes; Classic car 200 USD unit unclear; cancellation at 45 days overlaps; supplier inferred from folder; itinerary dates vs outbound return flights (Dec 3 round TK058 instead of TK064). Passport/visa claims copied as source statements pending current confirmation. No remaining seats, commission, hotel stars, discounts or snow guarantees invented.

Built-in image_gen created 5 illustrative gallery scenes (Erciyes, Cappadocia, Pamukkale, Istanbul, Balat) plus separate sale-style feature cover. Exported all as 1200×800 RGB JPEG quality=80; cover fitted with navy padding to preserve copy, gallery full 3:2. Uploaded 6 unique UUID JPEG keys to live R2; every live GET 200 and exact SHA256 checksum matched. Image provenance kind=ai now renders without fake PDF page claims. Trip page labels AI illustrations and its footer avoids attributing them to Unsplash. Source images live under data/ttk26-import/images; downloadable ZIP includes images and prompts.

TypeScript and production build pass. Browser verified CMS draft, all mapped short/wholesale fields, five gallery images loaded at natural 1200×800, correct 3 rounds and disabled booking for draft; preview https://tourdonjai.tourdonjai.workers.dev/services/wholesale-ttk26?preview=1 requires existing CMS Access login. No publication toggle changed or existing tours overwritten. User's original CMS form/tab preserved; separate QA tabs used.

## Cover ordering, image limit and deletion — 2026-10-07
Generated feature artwork is the authoritative cover and gallery item one. coverGallery normalizes and deduplicates cover/gallery ordering on reads and writes. Existing HEK22, HEK23 and TTK26 records were updated with their generated covers first, preserving other business fields with a compare-and-update query.
All displayed static photographs and 13 referenced R2 images were compressed to at most 150,000 bytes. R2 replacements use fresh UUID URLs to avoid immutable-cache conflicts; ignored .deployment/image-optimization holds migration snapshots and mapping. Uploads from files or HTTPS links run browser JPEG compression with adaptive quality/dimensions; storage API and catalog save enforce the limit. If a remote host disallows cross-origin fetching, download and upload the file through CMS. Future generated assets must also be compressed before import; cover artwork should be 3:2.
CMS now has permanent program deletion. Catalog tombstones suppress built-in seed fallback, and R2 cleanup deletes cover/gallery/source metadata images only when no remaining program references them. Failed cleanup retains references for retry. Closing or unpublishing a tour does not delete it. Font is Sarabun throughout the site.
Validation: tests/tour-media.mjs covers cover ordering, shared-file preservation, source-only media cleanup, missing images, external URLs and 150 KB limit; TypeScript and production build pass.


## Image upload repair — 2026-10-08
CMS image upload now validates returned media URLs before adding gallery entries, preventing blank/broken images when an upload fails. Gallery entries are filtered to valid URLs, and the feature cover can recover from the first valid gallery image. Production Git integration uses `.deployment/wrangler.production.json`; do not deploy the generated placeholder config.
