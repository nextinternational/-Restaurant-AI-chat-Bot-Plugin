# Restaurant AI Chat for Elementor

Frontend widget for the multi-tenant AI Customer Service platform.
One plugin, installed on each restaurant's WordPress site. Each site only differs by **Widget Key** and styling.

## Install
1. WordPress Admin > Plugins > Add New > Upload Plugin > choose `restaurant-ai-chat.zip` > Activate.
2. Requires Elementor (free or Pro) 3.5+.

## Use
1. Edit any page/template in Elementor. For a site-wide floating bubble, edit your **Footer** in Theme Builder (Elementor Pro) and drop the widget in.
2. Search for **AI Chat Assistant** and drag it in.
3. Content > Connection: set **Widget Key** and **API Base URL**, then switch **Demo mode** off.
4. Style the colors, size and texts to match the restaurant.

## Security rules baked into the widget
- No `restaurantId` anywhere in the browser. The widget sends only the public Widget Key.
- The Widget Key identifies, it does not authenticate. The backend must also validate the request `Origin` against the restaurant's allowed domains.
- Session token comes from the backend, lives in `sessionStorage`, and is sent as a Bearer token.
- Server text is rendered with `textContent` (no HTML injection). Phone link is built from a sanitised number returned by the backend.

## Connecting to the backend (v0.8.0 platform)
1. Run the backend and create a restaurant + widget key (`npm run db:seed` prints one, or use `npm run provision:restaurant`).
2. Add the WordPress site's exact origin (e.g. `https://myrestaurant.com`, no trailing slash, https) to that widget key's **allowed origins**. Origin must match exactly; `www.` and non-www are different origins.
3. Set a phone number: `npm run provision:settings -- --restaurant <slug> --phone "+1..."`.
4. In Elementor: **API Base URL** = your backend (https, e.g. `https://api.example.com`), **Widget Key** = the `wk_...` key, Demo mode OFF.

Calls made by the widget: `POST {api}/v1/chat/{widgetKey}/sessions` then `POST {api}/v1/chat/{widgetKey}/messages` with `Authorization: Bearer <token>`.
Replies: `{type:"answer"|"contact", message, contactPhone?}`. 401 -> new session automatically; 429 -> "too fast"; 403 -> origin not allowed.
