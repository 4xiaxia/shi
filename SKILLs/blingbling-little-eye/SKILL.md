---
name: blingbling小眼睛
description: Lightweight browser perception skill for structured websites. Use when an agent needs to understand the current webpage through DOM structure first, instead of starting with heavy screenshot/browser automation. Best for forms, admin panels, search pages, settings pages, and other pages with clear interactive elements.
category: browser
tags:
  - browser
  - dom
  - webpage
  - observation
  - structured-site
version: 1.0.0
official: false
---

# blingbling小眼睛

`blingbling小眼睛` is a small, lightweight page-perception skill.

Its job is simple:

1. Read the current webpage structure
2. Identify the important interactive elements
3. Return a clean structured observation for another agent to use

This skill is designed as **Eyes 1.0**, not a full browser automation platform.

## Priority Rule

If the agent is deciding between:

- reading page structure first
- or immediately using heavy browser automation

then prefer `blingbling小眼睛` first **when the page is likely DOM-readable**.

Typical examples:

- forms
- settings pages
- admin panels
- search/filter/list pages
- documentation pages

Recommended decision order:

1. use `blingbling小眼睛` to inspect the current page
2. decide whether the task is already clear
3. only escalate to heavier browser actions if real interaction is needed or the page is visually hard to read

In short:

- `blingbling小眼睛` = cheap first look
- heavy browser automation = second step when needed

## Best Use Cases

Use this skill when the task needs a lightweight understanding of the current page, especially on:

- forms
- admin dashboards
- settings pages
- documentation pages
- list/search/filter pages
- ordinary websites with readable DOM structure

Typical requests:

- "Look at this page first"
- "What can I click here?"
- "What inputs are on this page?"
- "Can you summarize the current webpage state?"
- "Before using heavy browser automation, inspect this page"

## Do Not Use

Do **not** rely on this skill as the main solution for:

- captcha solving
- canvas-heavy pages
- drag-and-drop interfaces
- visual-only layouts where the DOM does not reflect what humans see
- games
- complex login flows that require external auth state
- pages where screenshot-based or full browser automation is clearly required

If the page is highly visual or DOM-poor, this skill should report its limits clearly instead of pretending it can see everything.

## Core Output

When using this skill, prefer a compact structured observation with these fields:

```json
{
  "pageTitle": "",
  "pageUrl": "",
  "pageGoalGuess": "",
  "mainRegions": [],
  "interactiveElements": [],
  "inputs": [],
  "primaryActions": [],
  "scrollState": {
    "canScrollUp": false,
    "canScrollDown": false
  },
  "warnings": [],
  "recommendedNextStep": ""
}
```

## Run

Use the local observer script when you have a URL or HTML file:

```bash
node {baseDir}/scripts/observe-page.mjs --url "https://example.com"
node {baseDir}/scripts/observe-page.mjs --file "{baseDir}/references/demo-page.html"
```

Useful flags:

```bash
node {baseDir}/scripts/observe-page.mjs --url "https://example.com/settings" --interactive-limit 10 --input-limit 6
node {baseDir}/scripts/observe-page.mjs --stdin < saved-page.html
```

The script returns JSON directly.

Do not read the script unless you are maintaining the skill.
Just call it.

## Observation Rules

### 1. DOM-first, not screenshot-first

Start from page structure, visible text, interactive controls, and readable layout clues.

### 2. Keep the output small and useful

This is an internal skill for agents.
It does not need pretty prose.
It needs stable structure and useful signals.

### 3. Prefer high-value elements

Focus on:

- primary buttons
- navigation controls
- visible forms
- search inputs
- filters
- submission actions
- region titles

Do not dump every tiny element if that makes the output noisy.

### 4. Tell the truth when the page is unclear

If the page is unreadable, blocked, DOM-poor, or visually deceptive, say so in `warnings`.

### 5. Stay lightweight

`blingbling小眼睛 1.0` is for seeing the page clearly enough to help the main agent decide what to do next.

It is not responsible for finishing the whole browser task by itself.

## 1.0 Scope

Version `1.0` only aims to support:

- page title and URL awareness
- main region recognition
- interactive element listing
- input discovery
- simple action suggestion
- basic scrollability judgment

When the runtime provides a current-page bridge, `blingbling小眼睛` may also receive the active embedded browser page URL automatically as a lightweight first-look target.

Anything beyond that should be treated as future expansion, not assumed capability.

## Working Style

If another agent asks for page understanding:

1. inspect the current page
2. extract the minimum useful structure
3. return a compact observation
4. suggest the next safest action

If needed, use the reference file:

- `references/page-state-v1.md`
