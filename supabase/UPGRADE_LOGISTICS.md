# Photos, balances and travel — owner setup

The frontend upgrade can be deployed before these migrations. Until migration 004 is installed, existing inventory continues in V1 mode and Travel shows setup instructions. Reload the app after setup; the capability probe is cached for the session.

## Apply once, in this order

1. Take a Supabase database backup/snapshot using your project's available backup tooling. Keep a V1 CSV export as an additional item backup; CSV is not a complete database backup.
2. Open the **SQL Editor** for the existing inventory Supabase project. Run **004_balances_travel_media.sql** in full. Do not rerun migrations 001–003. The migration takes a short exclusive lock on items/locations while copying the existing quantities, so choose a quiet moment. It is transactional and rejects accidental duplicate execution before copying data.
3. Run **005_private_inventory_media.sql** in full. This creates/configures the private `inventory-media` Storage bucket, its 5 MB image MIME restrictions, and media/Storage RLS policies. It is a separate transaction and duplicate policy/version names prevent a second application. Do not mark the bucket public or add broad public policies.
4. In the SQL Editor, verify setup:

   ```sql
   select version from private.inventory_schema_versions order by version;
   -- Expect 4 and 5.
   select i.id, i.name, i.quantity, coalesce(sum(b.quantity), 0) as balance_total
   from public.inventory_items i
   left join public.inventory_balances b on b.inventory_item_id = i.id
   group by i.id
   having i.quantity <> coalesce(sum(b.quantity), 0);
   -- Expect zero rows.
   select id, public, file_size_limit, allowed_mime_types
   from storage.buckets where id = 'inventory-media';
   -- Expect public=false and a 5 MB limit.
   ```

5. Confirm `inventory_balances`, `inventory_movements`, `trip_manifest_items`, `trips`, and `inventory_media` are in the `supabase_realtime` publication. Migration 004 adds them automatically on hosted Supabase. Existing inventory/location subscriptions and the polling fallback remain enabled.
6. Reload https://inventory.frc4418.org/. Sign in as mentor/admin. Create a project location, move a test quantity and return it. Upload one item photo and one location photo. Create a test trip, approve/pack one allocation, return it, and close the trip. Repeat a movement with a student on a second device and confirm updates/history.

No new environment variables, service-role keys, authentication settings, DNS records, or custom-domain changes are required. Public frontend keys cannot run these SQL setup steps.

## Accounting and migration behavior

`inventory_balances` is canonical. Every item/location pair has at most one row. `inventory_items.quantity` remains a transactionally maintained total for existing dashboard, restock, CSV and older clients. Existing items, their IDs, expected/minimum/target values, ownership and history are preserved. An item with no location gets an explicit **Unassigned** balance rather than losing its count. Move those records to real homes when their physical storage is known.

`inventory_items.location_id` designates the **home/expected location**, not the only location with stock. `expected_quantity` applies at that home. `target_quantity` and the minimum threshold apply to the total. Location pages and audits operate on their own balances; item details show total tracked and all locations. Inventory table +/- changes the home balance and total; location +/- changes the selected balance and total. Absolute total edits/CSV corrections apply the difference at home and fail if they would remove units held elsewhere. A home metadata change can move stock only while all units are at the old home; otherwise use Move first. Transfers never change total tracked.

Drawer accountability is `max(0, expected - present - elsewhere)`. Elsewhere is tracked quantity in other balances of the same item; assignment credit is capped at the home's shortfall. The drawer still says **Incomplete / Assigned elsewhere** when stock is intentionally away. It says **Missing tools** with an unaccounted count when tracked balances cannot cover the expectation. A verified count does not resolve missing units.

## Trips and provenance

Trips create their own travel root plus Trailer, Pit Toolbox A/B, Robot Cart, Programming Case and Battery Cart locations. They preserve existing storage `location_type` (Drawer/Bin/etc.); the separate `classification` field distinguishes permanent/project/robot/travel/temporary locations without breaking drawer detection.

A lead/admin/mentor approves a manifest allocation with item, quantity, origin and initial travel location. Approval does not move stock or reserve it. Students can pack approved quantities once packing starts; insufficient source stock fails atomically. Generic moves cannot bypass the trip manifest to place stock in or remove it from a travel location.

Each allocation snapshots its original ownership and home. Partial packing, internal moves, returns and resolutions split allocation rows without changing their combined quantity or origin. Packed allocations track which balance their units occupy; they are provenance records, **not additional inventory**. The sum of packed allocations at an item/travel location matches its balance. Returned status records completed return movements; it is not a permanent reservation of those units at home after return.

Trip closure/cancellation is blocked until every approved/packed allocation is returned or explicitly resolved, and all travel balances are zero. Mentors/admins can resolve selected quantities with a required note: lost/consumed removes actual travel stock, transferred/manual resolution moves it to a specified non-travel destination. Unfilled approvals can be explicitly resolved without changing stock. Resolution remains visible in the return audit and history. Closure archives travel locations, preserving all references. Closed trips are read-only.

## Permissions and photos

- Readonly: view balances, movement history, trips and private media.
- Student: quantity corrections, verification, ordinary transfers, and packing/internal moves/returns of approved allocations in active trips. No trip creation, approvals, closure, resolutions or canonical photo management.
- Lead: student actions, manifest approvals, item photos in the assigned area, project location creation in that area, and photos for locations assigned to that area.
- Admin/mentor: trip lifecycle/resolutions, all photo/configuration operations and approvals.

Database roles come from active profiles, never browser input. New accounting tables grant clients SELECT only; checked SQL RPCs perform writes, hold row locks, and write movement attribution in the same transaction. RLS protects all new tables. Existing item metadata guards remain in force. The compatibility bridge prevents direct item edits from creating conflicting totals.

The private `inventory-media` bucket stores object bytes under `items/{UUID}/{UUID}.ext` and `locations/{UUID}/{UUID}.ext`. Metadata stores paths and descriptions only. Accepted files are JPEG/PNG/WebP up to 5 MB. The browser decodes photos and reduces larger images to at most 1280 pixels, using WebP compression. Authenticated viewers use one-hour signed URLs, refreshed while displayed. Upload/replace/delete policies check the current item/location area and role. Replacement uploads a new object before a version-checked metadata update, then removes the old object. If cleanup fails, the UI reports it; a mentor may remove that orphan object in Storage. Do not delete metadata by hand without considering object cleanup.

## Known scope limits

- One primary photo per item/location; additional galleries and trip cover photos are deferred.
- Local demo supports balances and trips through **Travel → Enable movement demo**. Photos require the shared Supabase backend; image binaries are never placed in local inventory rows.
- Manifest approval is not a stock reservation. Packing rechecks availability. School/shared filters use ownership at approval, so later canonical ownership edits cannot hide school equipment brought on a trip.
- CSV remains an item/total/home export. Same-workspace round trips preserve balances when totals are unchanged; it does not export complete balances, movement history, manifests, photos or trips. Use database backups for those.
- Each item currently has one designated expected/home location. Multiple independently expected home allocations for the same item are not implemented.
- Movement history shows the latest 30 matching records in the UI. No analytics, packing templates, QR codes, serialized checkout, reservations, BOM, purchasing or Onshape work is added.
- Automated shared tests use the actual migration SQL with a local Auth/REST/Storage contract fixture. They do not prove live Storage/Realtime configuration or physical inventory counts; complete the live smoke test after owner setup.

Storage references: https://supabase.com/docs/guides/storage/buckets/fundamentals and https://supabase.com/docs/guides/storage/security/access-control.
