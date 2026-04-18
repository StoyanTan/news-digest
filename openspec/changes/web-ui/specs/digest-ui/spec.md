## ADDED Requirements

### Requirement: Topic input with default value
The UI SHALL display a text input pre-filled with `"Technology"` that the user can edit before triggering a digest run.

#### Scenario: Default topic pre-filled
- **WHEN** the page loads
- **THEN** the topic input contains `"Technology"`

#### Scenario: User edits topic
- **WHEN** the user clears the input and types `"Climate Change"`
- **THEN** the input value is `"Climate Change"` and that value is used on the next run

### Requirement: Trigger button
The UI SHALL display a button labelled "Generate Digest" that initiates a digest run using the current topic input value.

#### Scenario: Button triggers run
- **WHEN** the user clicks "Generate Digest"
- **THEN** the browser calls `GET /ping` and awaits the result

#### Scenario: Button disabled during run
- **WHEN** a request is in progress
- **THEN** the button is disabled and labelled "Generating…"

#### Scenario: Button re-enabled after run
- **WHEN** the server responds (success or error)
- **THEN** the button is re-enabled and returns to the "Generate Digest" label

### Requirement: Status indicator
The UI SHALL display a status line below the button that reflects the outcome of the last action. Digest output is delivered via Discord — it is not shown in the browser.

#### Scenario: Success status
- **WHEN** the server responds `{ "ok": true }`
- **THEN** the status line reads "Discord connection OK!" in green

#### Scenario: Error status
- **WHEN** the server responds `{ "ok": false, "error": "…" }`
- **THEN** the status line shows the error message in red

#### Scenario: Status cleared on new run
- **WHEN** the user clicks "Generate Digest" again
- **THEN** the status line is cleared before the new request begins
