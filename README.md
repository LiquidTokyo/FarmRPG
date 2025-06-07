Item Drop Tracker for FarmRPG
A lightweight Tamper-monkey userscript that adds a real-time statistics box to every Explore area in FarmRPG.
It counts — and keeps counting — every item you loot, the exact stamina you spend, and how many Apple Ciders or Arnold Palmers you burn through while farming.

Features
Live item counters – all items the location can drop are shown from the moment you enter.

Automatic discovery – the script reads the location’s info page once and never hard-codes lists.

True stamina usage – Wanderer (or other stamina discounts) are measured, not guessed.

Inventory-cap highlight – items you can’t pick up (grey icons) get a red background; the tint is removed automatically when space is free.

Per-location reset – a tiny “Reset” button wipes only the current area’s session.

Global reset – click the game’s top-bar refresh ↻ icon to clear all sessions at once.

Ephemeral sessions – nothing is written server-side; data lives only in your browser (plus an icon cache).

Numbers are formatted with a dot as the thousands separator, e.g. 21.498.

Installation
Install Tampermonkey (Chrome, Edge, Firefox).

Press Create a new script, replace the default stub with the content of
Item Drop Tracker – Ephemeral Sessions v1.1.user.js, click Save.

Refresh FarmRPG – the tracker box now appears automatically in every Explore location.

Usage
Action	What happens
Explore click	# of Explores + Stamina rise, item counters increase.
Drink Apple Cider	Adds the bundled explores + stamina + drop batch.
Drink Arnold Palmer	Adds items (no explores, no stamina).
Per-location Reset	Click the Reset button in the box’s top row.
Global Reset	Click the game’s navbar refresh ↻ icon or hard-reload the page.

Items already full before entering a location are not counted;
free inventory slots first if you want them included.

Known Issues
Lemonades are currently detected as Arnold Palmers and counted together.

Roadmap
Correctly separate Lemonade vs. Arnold Palmer.

Extend support to all Fishing locations.

Optional: export session data as CSV.

Contributing
Pull requests are welcome!
Please open an issue first to discuss major changes or new ideas.

License
MIT – see LICENSE for details.

FarmRPG is ©️ its respective owners. This userscript is strictly client-side, sends no automated requests, and does not violate the game’s Terms of Service.
