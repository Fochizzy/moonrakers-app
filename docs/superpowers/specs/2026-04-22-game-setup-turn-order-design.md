# Moonrakers Game Setup Turn Order Design

Date: 2026-04-22
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will replace the current left-right turn-order controls in [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx) with a vertical drag-and-drop reorder flow.

The interaction is drag-and-drop, but not freeform. Each player card will move within a fixed vertical list, snapping into valid order slots as the user drags. The setup screen will show a realtime text confirmation of the current turn order at the top and a `Submit` action at the bottom.

When the user submits, the setup screen will start the active game using the reordered player list while preserving each player's profile identity, chosen card art, color, initials, and computed `startOrder`. The game screen does not need a new visual turn-order presentation for this change.

## Confirmed Product Decisions

- Reordering happens in `Game Setup`, not in `Game`.
- The interaction must be drag-and-drop.
- The drag behavior must be slot-based and snapping, not freeform placement.
- The ordered list is vertical, with the first player on top and the rest descending downward.
- The setup screen must show a live text confirmation of the turn order.
- The primary action at the bottom is `Submit`.
- The reordered setup payload must preserve each player's profile identity, card art, and color when sent into the game state.
- The game screen can keep its current visual layout for this change.

## Goals

- Make turn-order setup feel direct and tactile instead of relying on left-right move buttons.
- Show the full turn order clearly in a top-to-bottom layout.
- Keep the current setup-to-game flow intact while improving the ordering step.
- Preserve player profile fidelity when starting a game.
- Keep the interaction constrained so users always land in a valid order.

## Non-Goals

- Rebuilding the main `Game` screen UI.
- Introducing a freeform drag surface or custom board layout.
- Changing scoring, turn rotation, or winner logic.
- Creating a second source of truth for player identity outside the store.

## Current Architecture Context

The current setup flow already resolves selected players, builds a `turnOrder` array, and starts the active game through `startActiveGame(...)` in [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts).

Today, [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx):

- parses selected players or group members from route params,
- resolves colors with `resolveStoredPlayerColor(...)`,
- stores local `turnOrder` state,
- reorders players with left-right move buttons,
- sends `id`, `name`, `initials`, `color`, `assignedCardArtIndex`, and `startOrder` into `startActiveGame(...)`.

[components/player/PlayerCardIcon.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/player/PlayerCardIcon.tsx) already renders a player's card art using `assignedCardArtIndex` or a stable fallback derived from profile identity and color. That means this feature should reuse the existing profile and card presentation rather than invent a new card model.

The main architectural need is therefore a UI and interaction rewrite of the reorder surface, not a data-model rewrite.

## Recommended Architecture

### Core Direction

Use `react-native-draggable-flatlist` inside [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx) to render the turn-order list as a vertical, slot-based drag list.

The screen will have three main zones:

1. `Header summary`
2. `Vertical snapping reorder list`
3. `Bottom action bar`

### Why This Approach

`react-native-draggable-flatlist` is already installed in the project and matches the desired interaction well:

- drag-and-drop is native to the component,
- reordering is list-based instead of freeform,
- dropped items settle into valid slots,
- the final state is a plain ordered array, which matches the existing store contract.

This is lower risk than writing custom drag math with reanimated or gesture primitives.

## UI Design

### Header Summary

The top of the screen should show a clear realtime confirmation of the current order.

Recommended content:

- title: `Game Setup`
- short guidance text explaining that the first player on top starts the game
- live turn-order text, for example:
  - `Turn Order: 1. Alice, 2. Bob, 3. Cara`
- optional first-player callout, for example:
  - `Starting Player: Alice`

This summary must update immediately whenever the list order changes.

### Reorder List

The central interaction is a vertical list of player cards.

Each row should show:

- player card art via `PlayerCardIcon`
- player name
- player color styling or accent
- order number based on the current list position

The list behavior should be:

- press and drag a row vertically,
- the active row lifts visually while dragging,
- surrounding rows shift to make room,
- the dragged row snaps into valid list positions,
- releasing the row commits it to the nearest valid slot.

The list must not allow loose placement between items or outside the list.

### Bottom Action Bar

The bottom bar should keep:

- a secondary `Back` action
- a primary `Submit` action

`Submit` replaces the current `Start` wording to match the user's requested language and to make the interaction read as confirmation of the chosen order.

## Interaction Rules

### Validity

The current setup constraints still apply:

- minimum `2` players,
- maximum `5` players,
- only registered players can start a cloud game.

If the player set is invalid, the list can still render, but the `Submit` button must stay disabled using the same logic already present in setup.

### Dragging

- Only one row can be actively dragged at a time.
- Dragging should be vertical only.
- Reordering updates the local `turnOrder` array on drop.
- The UI should not permit arbitrary x-y placement.

### Live Feedback

During and after reorder:

- the order numbers on the cards must stay in sync with the rendered list,
- the header summary text must update to reflect the latest order,
- the current top row is always the starting player.

## Data Flow

### Setup State

Keep `turnOrder` as the local source of truth in [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx), but let drag-and-drop update it instead of left-right button handlers.

The list entries should continue to preserve player profile fields already available from selection:

```ts
type SetupTurnOrderPlayer = {
  id: string;
  name?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};
```

### Submit Payload

On `Submit`, the screen should call `startActiveGame(...)` with the reordered players, preserving the existing payload shape and ensuring the final array order becomes the canonical turn order.

Each submitted player should include:

- `id`
- `name`
- `initials`
- `color`
- `assignedCardArtIndex`
- `startOrder`

`startOrder` should be recomputed from the final vertical order, where:

- top item = `0`
- next item = `1`
- and so on

### Game Screen Expectations

The `Game` screen should not need a new UI treatment for this feature.

It only needs the richer ordered player payload it already consumes indirectly through the active game store:

- player identity remains stable through `id`
- card art remains stable through `assignedCardArtIndex`
- color remains stable through `color`
- turn order remains stable through `startOrder`

## Component Structure

Recommended in-place structure for [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx):

- keep existing param parsing and resolved-player setup
- replace the horizontal card rail with a vertical draggable list
- replace left-right reorder controls with a drag handle or long-press drag affordance
- keep the start animation overlay, renamed only as needed for `Submit` wording

Optional helper extraction if the file starts to sprawl:

- `GameSetupTurnOrderSummary`
- `GameSetupTurnOrderRow`
- `buildTurnOrderSummaryText(...)`

These helpers should be introduced only if they clarify the file; the main change does not require a broad refactor.

## Error Handling

- If route params resolve to no players, render the empty or disabled setup state rather than crashing.
- If any player is missing optional display fields, fall back to existing name or initials logic.
- If a player is missing `assignedCardArtIndex`, rely on the current `PlayerCardIcon` fallback behavior.
- If drag-and-drop fails to initialize for any reason, the screen should still avoid corrupting `turnOrder`.
- `Submit` must remain blocked whenever current registration rules fail.

## Testing Strategy

Add focused coverage around setup behavior rather than broad repo-wide tests.

### Logic Coverage

- initial `turnOrder` is derived from selected players or selected group members
- reordered list produces recomputed `startOrder` values in top-to-bottom order
- submit payload preserves `id`, `color`, and `assignedCardArtIndex`
- live summary text reflects the latest ordered names

### UI Coverage

- game setup renders a vertical list instead of the current horizontal move rail
- dragging an item results in a snapped reordered list
- the top item is visually and textually treated as the starting player
- `Submit` is disabled when player validity rules fail

### Regression Focus

- existing setup entry from both direct player selection and saved groups still works
- the active game starts with the expected ordered players
- card art and color remain correct after reorder and after entering the game flow

## Rollout Outcome

When complete, `Game Setup` will feel like a true order-confirmation screen: players are arranged in a vertical stack, dragged into place with snapping reordering, confirmed by live text at the top, and submitted as a clean, profile-preserving turn-order payload into the game state.
