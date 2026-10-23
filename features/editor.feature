Feature: Editor
  The editor holds the file named on the command line, Rich mode renders the
  markdown in place and Code mode shows it raw, and the editor's own shortcuts
  and copy buttons work.

  Scenario: Opens the file named on the command line
    Given a markdown file "note.md"
      """
      # On the bridge
      """
    Then the header shows "note.md"
    And the editor shows "On the bridge"

  Scenario: Code mode shows the raw markdown
    # Rich mode shows a marker on the line the cursor sits on, and the cursor
    # starts on the first line, so the heading sits below it.
    Given a markdown file "title.md"
      """
      Body

      # Title
      """
    Then the editor does not show "#"
    When I click the Code button
    Then the editor shows "# Title"
    When I click the Rich button
    Then the editor does not show "#"
    When I press Alt+M
    Then the editor shows "# Title"
    When I press Alt+M
    Then the editor does not show "#"

  Scenario: Bold and undo
    Given a markdown file "bold.md"
      """
      hello
      """
    When I click the Code button
    And I select all
    And I press Ctrl+B
    Then the editor shows exactly "**hello**"
    When I press Ctrl+Z
    Then the editor shows exactly "hello"

  Scenario: Copy a code block
    Given a markdown file "snippet.md"
      """
      # Snippet

      ```js
      const answer = 1;
      ```
      """
    When I click the Copy button on the code block
    Then the Copy button reads "Copied!"
