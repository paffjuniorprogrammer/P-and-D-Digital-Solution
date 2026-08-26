PAFly preview investigation

1. The reported URL https://pddigitalsolutiom.vercel.app/pafly.rw returns Vercel 404 because it is an internal relative path, not the PAFly domain.
2. The actual PAFly site is reachable at https://www.pafly.rw/.
3. The portfolio code inserts project URLs directly into href attributes and uses the raw URL for the screenshot preview service. A value such as pafly.rw is therefore treated as a relative path.
4. The portfolio falls back to a generic image after preview failures, so PAFly does not reliably show its own homepage.
5. The fix should normalize bare domains to https://, use the normalized URL for href and screenshots, and provide a local PAFly homepage preview fallback.
