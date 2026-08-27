## Database-only verification notes

- Direct Supabase REST reads succeeded against the configured project.
- Current public database content returned by Supabase:
  - Projects: PAFLY RW, POS System (UMUCURUZI POS), Advanced Luxe Line Ltd.
  - Active offer: Weekend Promotion: Custom Business Website with price range `100K - 200K RWF`.
  - Contact: WhatsApp `250793063512`, email `paffdaddy06@gmail.com`, and the database WhatsApp message.
- Before the fix, `index.js` rendered localStorage/default content immediately and then attempted a background query.
- Before the fix, `index.html` loaded `index.js` before the Supabase CDN/client scripts, so `window.db` was unavailable when the queries were invoked.
- After the fix, the local homepage rendered the current database project names and the database offer/contact values. The old hardcoded sample project cards were not rendered.
- Browser content persistence was removed from `index.js` and `admin.js`; only in-memory state remains, while admin authentication is also no longer restored from sessionStorage.


## Browser DOM verification

The updated homepage reported `databaseClientAvailable: true`, empty `localStorageKeys`, and empty `sessionStorageKeys`. The rendered project titles were `PAFLY RW`, `POS System (UMUCURUZI POS)`, and `Advanced Luxe Line Ltd`; the offer price was `100K - 200K RWF`; the email was `paffdaddy06@gmail.com`; and the WhatsApp display/link used `+250793063512`. The contact section screenshot also showed the database email, WhatsApp number, and offer price rather than the previous browser-stored values.


## Admin-page verification

The updated admin page opened to the fresh login screen, displayed the message `All content is loaded from the database`, and produced no browser console output/errors. Because the admin token is now memory-only, refreshing the page intentionally requires a new login rather than restoring a token from sessionStorage.


## Stale browser-data simulation

A simulated old `pnd_admin_state_v1` record was written into localStorage and the homepage was reloaded. The updated code does not read that key; the next DOM check will confirm that database values remain visible instead of the simulated stale project, offer, or contact values.


## Reload result

After the simulated stale browser record was present, the homepage still rendered the live database project list and offer/contact values. The browser view of the admin page remained a fresh login screen, confirming that content and admin credentials are not restored from browser storage.
