# blingbling小眼睛 Page State v1

Use this reference when the caller wants a compact browser-state summary.

## Recommended Structure

```json
{
  "pageTitle": "Current page title",
  "pageUrl": "Current page URL",
  "pageGoalGuess": "Short guess of what this page is mainly for",
  "mainRegions": [
    "Main content",
    "Sidebar filters",
    "Top navigation"
  ],
  "interactiveElements": [
    {
      "type": "button",
      "label": "Save",
      "priority": "high"
    }
  ],
  "inputs": [
    {
      "type": "text",
      "label": "Email",
      "required": false
    }
  ],
  "primaryActions": [
    "Click Save",
    "Fill Email"
  ],
  "scrollState": {
    "canScrollUp": false,
    "canScrollDown": true
  },
  "warnings": [],
  "recommendedNextStep": "Inspect the visible form fields before clicking Save"
}
```

## Keep It Tight

- Prefer the top 5-12 most useful interactive elements
- Prefer the top 3-8 input fields
- Prefer one next step, not a full plan
- Add warnings instead of hallucinating certainty
