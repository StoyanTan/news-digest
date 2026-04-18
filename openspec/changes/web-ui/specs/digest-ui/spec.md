## ADDED Requirements

### Requirement: Topic input with default value
The UI SHALL display a text input pre-filled with `"Technology"` that the user can edit before triggering a digest run.

#### Scenario: Default topic pre-filled
- **WHEN** the page loads
- **THEN** the topic input contains `"Technology"`

#### Scenario: User edits topic
- **WHEN** the user clears the input and types `"Climate Change"`
- **THEN** the input value is `"Climate Change"` and that value is used on the next run

### Requirement: Test-connection checkbox
The UI SHALL display a checkbox labelled "Test Discord connection only (no AI call)" that determines the action taken when the button is clicked.

#### Scenario: Checkbox unchecked (default)
- **WHEN** the checkbox is unchecked and the user clicks "Generate Digest"
- **THEN** the browser opens an SSE stream to `GET /run?topic=<topic>` and waits for a `done` or `error` event

#### Scenario: Checkbox checked
- **WHEN** the checkbox is checked and the user clicks "Generate Digest"
- **THEN** the browser calls `GET /ping` (zero AI tokens) and awaits the JSON result

### Requirement: Trigger button
The UI SHALL display a button labelled "Generate Digest" that initiates an action (ping or real run) using the current topic and checkbox state.

#### Scenario: Button disabled during run
- **WHEN** a request is in progress
- **THEN** the button is disabled and labelled "Generating…" (real run) or "Testing…" (ping)

#### Scenario: Button re-enabled after run
- **WHEN** the server responds (success or error)
- **THEN** the button is re-enabled and returns to the "Generate Digest" label

### Requirement: Status indicator
The UI SHALL display a status line below the button that reflects the outcome of the last action. Digest output is delivered via Discord — it is not shown in the browser.

#### Scenario: Ping success
- **WHEN** the ping completes and the server responds `{ "ok": true }`
- **THEN** the status line reads "Discord connection OK!" in green

#### Scenario: Digest success
- **WHEN** the SSE stream ends with `event: done`
- **THEN** the status line reads "Digest sent to Discord!" in green

#### Scenario: Error status
- **WHEN** the server responds with an error (ping or run)
- **THEN** the status line shows the error message in red

#### Scenario: Status cleared on new run
- **WHEN** the user clicks "Generate Digest" again
- **THEN** the status line is cleared before the new request begins
