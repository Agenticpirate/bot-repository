> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Templating Node

> Apply Jinja templating to perform lightweight data transformations.

The Templating Node allows you to perform custom data transformations on a set of defined inputs to create a new output. You can use this to define constants, manipulate data before feeding into a prompt, or massage a response to a format of your liking.

## Templating Node Interface

The Templating Node provides a simple interface for configuring your data transformations:

![Templating Node](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-templating_node_1.png)

When you open the Templating Node, you'll see a detailed configuration interface where you can define your template:

![Templating Node Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-templating_node_2.png)

Check out our [Common Data Transformation Templates](/product/workflows/common-data-transforms) for some common examples.

## Pro Tips

* **XML Tags for LLMs**: Use XML tags to help LLMs delimit where long chunks of context start and stop. This can give huge performance boosts.
* **Jinja Flexibility**: Remember that you can use Jinja directly in your Prompt Node Blocks as well as in Templating Nodes.

## Troubleshooting Tips

#### Tip: JSON Syntax

You may have a templating node that outputs JSON which seems valid, but yields the following error when you click "Test" or run your workflow:

#### Tips - Using Jinja

Jinja has a tendency to leave hard-to-see whitespace which can cause issues when doing equality checks in places like Metrics or Conditional Nodes.

![Templating Node JSON Error](https://storage.googleapis.com/vellum-public/help-docs/templating_node_json_sensitivity.png)

Use double quotes when working with JSON

#### Tip: Unexpected Whitespace

Jinja has a tendency to leave hard-to-see whitespace which can cause issues when doing equality checks in places like Metrics or Conditional Nodes.

```jinja
{# this example will have invisible whitespace #} 
{% if some_condition %}
    {{ result A }}
{% else %}
    {{ result B }}
{% endif %}

{# this will give the result you expect #} 
{%- if some_condition -%}
    {{- result A -}}
{%- else -%}
    {{- result B -}}
{%- endif -%}
```

# Common Templates

The Templating Node supports [Jinja2](https://jinja.palletsprojects.com/en/3.1.x/templates/) syntax and is a flexible way of performing light-weight data transformations as part of your Workflow. Here are some common data manipulations you may want to make in a Workflow and how you define them via Templating Nodes.

## String Manipulation

### Output Only the First n Characters

Useful if you want to ensure that you’re not providing too much context to a prompt.

![String Manipulation](https://storage.googleapis.com/vellum-public/help-docs/template_string_manipulation.png)

#### Template

```jinja2
{{ user_input[:10] }}
```

#### Example

```
Inputs:
-------
user_input = "Hello, world!"

Output:
-------
"Hello, wor"
```

## JSON Manipulation

### Checking LLM Output for Valid JSON

If you’re trying to extract structured JSON from unstructed text using a prompt, or if you want to use OpenAI’s function-calling functionality, it’s likely you’ll need to check whether an LLM’s response is valid JSON and if so, convert the output string as proper JSON.

You can also extract specific properties from valid JSON strings.

Here’s how to do it:

![JSON Manipulation](https://storage.googleapis.com/vellum-public/help-docs/template_json_manipulation.png)

#### Template

```jinja2
{% if maybe_json|is_valid_json_string %}
    {{ maybe_json }}
    
    ## to extract specific properties from the JSON
    {{ json.loads(maybe_json).property }}
{% else %}
    {{ {} }}
{% endif %}
```

#### Example 1: Valid JSON

```
Inputs:
-------
maybe_json = '{"key": "value"}'

Output:
-------
{"key": "value"}
```

#### Example 2: Invalid JSON

```
Inputs:
-------
maybe_json = 'not valid json'

Output:
-------
{}
```

## Chat History Manipulation

### Output the Most Recent n Messages in Chat History

If you’re building a chatbot and conversations can be long-lived, you may find that your chat histories are too long to fit within the context window of a prompt.

Once simple solution is to only ever include the most recent `n` messages from the conversation. Here’s how you can do this:

![Chat History Manipulation](https://storage.googleapis.com/vellum-public/help-docs/template_chat_history_manipulation.png)

#### Template

```jinja2
{{ chat_history[-2:] }}
```

#### Example

```
Inputs:
-------
chat_history = [
    {"role": "USER", "text": "What color is the sky?"},
    {"role": "ASSISTANT", "text": "Blue"},
    {"role": "USER", "text": "But why"}
]

Output:
-------
[
    {"role": "ASSISTANT", "text": "Blue"},
    {"role": "USER", "text": "But why"}
]
```

## Search Result Manipulation

### Citing Sources via Chunk Concatenation Customization

Search Nodes make it easy to query a vector store for text that’s semantically similar to some input. By default, the chunks of text that are returned are concatenated together into a single string using a configurable separator (e.g. `\n\n#####\n\n`). The flattened string can then be fed directly to Prompt Nodes as an input variable and referenced within your prompt template.

However, if you want your Prompt to cite its sources and say where it got the info it used to generate its response, then you’ll need more than just the chunk text. You need the name/id/url/etc of the document each chunk came from and you need to provide this info to your Prompt in a consumable form. This is where Templating Nodes come in.

The template below takes in the raw search results and performs custom chunk concatenation, but also pulls in info from the document associated with each chunk.

![Search Result Manipulation](https://storage.googleapis.com/vellum-public/help-docs/template_search_results_manipulation.png)

#### Template

```jinja2
{% for result in search_results -%}
Source:
{{ result.document.label }}

Content:
{{ result.text }}
{% if not loop.last %}

#####

{% endif %}
{% endfor %}
```

#### Example

```
Inputs:
-------
search_results = [
    {
        "text": "Hello, world!",
        "score": 0.015,
        "keywords": ["hello", "world”],
        "document": {
            "id": "22df06cf-c876-45ef-a162-4836c410e37b",
            "label": "introduction.txt",
            "external_id": "introduction.txt"
        }
    },
    {
        "text": "The sky is blue.",
        "score": 0.005,
        "keywords": ["sky", "blue”],
        "document": {
            "id": "d9655f5f-885e-400e-b000-00b605a03a99",
            "label": "description.txt",
            "external_id": "description.txt"
        }
    }
]

Output:
-------
Source:
introduction.txt

Content:
Hello, world!


#####


Source:
description.txt

Content:
The sky is blue.
```