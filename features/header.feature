Feature: Header
  The header holds the file controls, the file name and its unsaved dot, and a
  save writes exactly the editor's text to disk.

  Scenario: A new document is Untitled until you type
    Given no file is open
    Then the header shows "Untitled"
    And the header shows no unsaved dot
    When I type "Hello"
    Then the header shows a dot with "Unsaved changes"

  Scenario: Save writes exactly the editor's text
    Given a markdown file "crlf.md" with CRLF line endings
      """
      first
      """
    When I click the Code button
    And I put the cursor at the end
    And I type "second"
    And I press Ctrl+S
    Then the header shows no unsaved dot
    And the toast reads "crlf.md saved successfully"
    Then the file "crlf.md" on disk holds, with CRLF line endings:
      """
      first
      second
      """

  Scenario: The header fits at 640 px
    Given a markdown file with a 120-character name
    And the window is 640 by 480
    Then the header controls sit in one row in order
    And the file name is truncated
    And the page does not scroll sideways

  Scenario: The file name is centred
    Given a markdown file "centre.md"
      """
      body
      """
    Then the file name is centred in the window
    When I open Settings
    Then the file name is centred in the window
