# Image Studio

## What it does

Generates and edits images using AI models. Create illustrations, modify photos, generate art, and produce visual assets from text descriptions.

## Setup required

A Gemini API key is required. If one isn't configured, your assistant will prompt you to set it up on first use

## Permissions

- No macOS permissions needed for generation
- File system permission needed if saving images to your machine

## Common prompts

| You say...                                       | What happens                                        |
| ------------------------------------------------ | --------------------------------------------------- |
| “Generate an image of a sunset over mountains”   | Creates an AI-generated image from your description |
| “Make me a logo for a coffee shop called 'Brew'” | Generates a logo design                             |
| “Edit this image to remove the background”       | Modifies an existing image                          |
| “Create a cartoon version of this photo”         | Transforms an image style                           |
| “Make a banner image for my blog post about AI”  | Generates sized-for-purpose assets                  |
| “Generate 4 variations of this design”           | Multiple options to choose from                     |

## Configuration

- **Models:** Nano Banana 2 (default, fast) or Nano Banana Pro (higher quality, slower)
- **Variants:** Generate 1–4 variations per prompt to pick the best result
- **Modes:** Text-to-image (generate from a prompt) or edit mode (modify an existing image)

## Tips & gotchas

- **Be descriptive:** The more detail in your prompt, the better the result. “A watercolor painting of a golden retriever sitting in a field of lavender at sunset” beats “a dog.”
- **Iterate:** First generation not perfect? Say “make it more colorful” or “try a different angle.” Your assistant refines based on feedback.
- **Formats:** Images are generated as PNG or JPEG. Specify if you have a preference.
- **File delivery:** Generated images appear inline in your assistant’s reply and are saved in its workspace, so you can refer back to them or ask for edits later. You can also ask your assistant to save them to a specific folder on your machine (requires file access permission).
