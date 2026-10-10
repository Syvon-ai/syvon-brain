# run_diagnostics

Render the connector diagnostic panel: checks whether the widget sandbox allows blob-module import and WebAssembly, which determines what kinds of players can run here. Use when asked to test, probe or debug the connector UI, or whether Rive/wasm is supported. NOTE: the checks run IN the sandbox and their results are shown ONLY in the panel the user sees — this tool cannot return them to you. To learn the outcome, ask the user what the panel reports.

