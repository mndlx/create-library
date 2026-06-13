---
name: panel-ui
description: The standard way to build detail / inspector / settings panels in the create-library back-office (bo-web). Use whenever adding or restyling a side panel, properties panel, settings form, or any "sections of fields" UI. Enforces the shared primitives in bo-web/src/components/inspector.tsx so every panel reads the same.
---

# Inspector / detail panel UI standard

Every detail, inspector, settings, or properties panel in `bo-web/` is built
from the primitives in `bo-web/src/components/inspector.tsx`. Do **not** write
ad-hoc panel layouts (loose `TextField`s with floating labels, custom headers,
`FormControlLabel` checkboxes, etc.). Match the house style.

## The look

- A panel is a vertical stack of **flat, collapsible `Section`s** separated by
  thin dividers — no big accordion chrome, no cards-within-cards.
- Each `Section` has an **overline header** (uppercase, letter-spaced, muted),
  an optional one-line **description** caption, and an optional right-aligned
  **action**. Clicking the header toggles a chevron and collapses the body.
- Every labelled control is one of **two row types**, both with the label
  starting at the same left edge so labels line up in one column:
  - **Input / select row** (`Field`) — a small fixed left label column, the
    control fills the value column. Use for every text/select/path value.
  - **Toggle row** (`SwitchField`) — the label grows from the left, the `Switch`
    is pinned to the right edge. Use for every boolean.
- Labels are short and **truncate with a tooltip** (`noWrap` + `title`); keep
  them terse so they fit the label column. `StackedField` (label above) exists
  only for rare wide content — avoid it in panels; prefer `Field`.
- Controls are **filled, compact** (`PanelInput` / `PanelSelect`): a dark filled
  box with a 1px divider border, no floating label. Toggles are MUI `Switch`,
  never checkboxes.

## Primitives (import from `./inspector`)

- `Section({ title, description?, action?, defaultOpen?, children })` — collapsible group.
- `Field({ label, hint?, control, align? })` — inline label-left / control-right row.
- `SwitchField({ label, hint?, checked, onChange })` — inline label + `Switch`.
- `StackedField({ label?, hint?, children })` — caption label above a full-width control.
- `PanelInput(props: TextFieldProps)` — filled compact input (also `select`, `multiline`).
- `PanelSelect({ value, onChange, options, fullWidth?, sx? })` — filled compact dropdown.

For directory/path inputs use `FolderField` from `./FolderPicker` (a
server-backed folder browser), never a free-text path field. For confirmations
and single-value prompts use `useDialogs()` from `./dialogs` — never native
`alert/prompt/confirm`.

## Pattern

```tsx
<Section title="Retry & timeout" description="Per-instance override; folds into the IR.">
  <Field label="Attempts" control={<PanelInput value={n} onChange={...} sx={{ width: 90 }} />} />
  <Field label="Backoff" control={
    <PanelSelect value={backoff} onChange={setBackoff} sx={{ width: 150 }}
      options={[{ value: 'fixed' }, { value: 'exponential' }]} />
  } />
  <Field label="Timeout" control={
    <PanelInput value={ms} onChange={...} sx={{ width: 110 }}
      InputProps={{ endAdornment: <InputAdornment position="end">ms</InputAdornment> }} />
  } />
  <SwitchField label="Breakpoint" checked={brk} onChange={setBrk} />
</Section>
```

Reference implementations: `bo-web/src/components/RightPanel.tsx` and
`VariablesPanel.tsx`. When you touch a panel, leave it conforming to this skill.
