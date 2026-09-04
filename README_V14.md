V14 – Real Clipboard Copy Fix

Keeps V13 Blob/share flow unchanged. Improves shared-view one-click URL copy by preferring synchronous document.execCommand("copy") with a real selectable textarea, then falling back to navigator.clipboard.writeText().

Deploy by replacing the project source with this folder and redeploying on Vercel.
