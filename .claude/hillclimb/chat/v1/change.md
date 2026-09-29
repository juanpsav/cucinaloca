Only show text from the turn that ends the reply

The baseline found the model's working notes reaching the cook ("Or just remove it? They didn't say what they have. I'll remove the pancetta…"): 13 of 72 runs had text written right before a tool call, and the app streamed all text. The agent now buffers each turn's text and emits it only when that turn doesn't end in a tool call. Status updates ("Updating the recipe…") still stream immediately. Nothing else changed: same prompt, model, tools and graders.
