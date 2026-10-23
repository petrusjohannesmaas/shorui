Feature: Appearance
  Shorui starts in the Dark theme with the Blue accent, and Settings changes the
  theme and the accent. A change applies at once and survives a restart, and the
  editor keeps its document across a visit to Settings.

  Background:
    Given no settings are saved
    And the app has just started

  Scenario: First start uses Dark and Blue
    Then the app uses the "Dark" theme
    And the window background is "#1e1e1e"
    And the accent colour is "#3584e4"

  Scenario: Theme and accent survive a restart
    When I open Settings
    And I choose the "Light" theme
    And I choose the "Teal" accent
    And the app restarts
    Then the app uses the "Light" theme
    And the window background is "#fafafb"
    And the accent colour is "#2190a4"
    When I open Settings
    Then the theme selector offers "Light, Dark" with "Light" chosen
    And the accent swatches are "Blue, Teal, Green, Yellow, Orange, Red, Pink, Purple, Slate" with "Teal" chosen

  Scenario: Alt+T switches the theme anywhere
    When I press Alt+T
    Then the app uses the "Light" theme
    When I open Settings
    And I press Alt+T
    Then the app uses the "Dark" theme
    When the app restarts
    Then the app uses the "Dark" theme

  Scenario: Settings keeps the document as it was
    Given a markdown file "long.md" with 200 lines
    And the editor is scrolled to line 150
    And the cursor is on line 150
    And I type "x" at the cursor
    And I remember the editor state
    When I open Settings
    Then the editor is inert
    When I press Escape
    Then the Settings panel is gone
    And the editor state matches
    When I press Ctrl+Z
    Then the editor no longer contains "x"

  Scenario: The accent colours the editor
    Given a markdown file "accent.md" with a link, a blockquote and a heading
    When I choose "Purple" in Settings
    And I close Settings
    Then the link uses the accent text colour
    And the blockquote bar is "#9141ac"
    And the caret uses the accent text colour
    And the selection uses the accent
    And the active mode button is "#9141ac"
    And the heading uses the foreground colour

  Scenario: Editor fonts
    Given a markdown file "fonts.md" with a heading, a fenced code block and inline code
    Then the rich editor's font is "Geist Variable"
    And the fenced code line "const answer = 42;" is in "Geist Mono Variable"
    And the inline code "inline_snippet" is in "Geist Mono Variable"
    When I click the Code button
    Then the code editor's font is "Geist Mono Variable"
