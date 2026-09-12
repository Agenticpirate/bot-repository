> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Reusing Metrics with Different Configurations in Test Suites

> Learn how to use the same Metric multiple times in a test suite with different configurations to evaluate different aspects of your LLM outputs.

When evaluating LLM outputs, you may want to check for different criteria using the same type of Metric. Vellum allows you to add the same Metric multiple times to a test suite, each with different configurations and names, enabling more comprehensive evaluation of your outputs.

## Why Reuse Metrics?

There are several scenarios where reusing the same Metric with different configurations is valuable:

* **Evaluating different aspects of the same output** - For example, using an LLM-as-Judge Metric to evaluate both factual accuracy and tone in a response
* **Checking for different expected values** - Testing if an output contains one of several possible correct answers
* **Applying different thresholds** - Using the same Metric with different strictness levels
* **Evaluating different parts of a complex output** - Checking different sections of a structured response

## Adding Multiple Instances of the Same Metric

To add multiple instances of the same Metric to your Test Suite:

1. Navigate to your test suite
2. Add your first Metric as normal through the "Add Metric" button
3. Configure the Metric with your first set of inputs and parameters
4. Add the same Metric again through the "Add Metric" button
5. Give this instance a different name that reflects its specific purpose
6. Configure it with different inputs or parameters

## Renaming Metric Instances

When using the same Metric multiple times, it's important to rename each instance to clearly indicate its purpose:

1. When adding or editing a Metric in your test suite, look for the Metric name field at the top of the configuration panel
2. Change the default name to something descriptive that indicates what this specific instance is evaluating
3. This custom name will appear in the test suite results, making it clear which aspect of the output is being evaluated

![Renaming a Metric instance](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/4cedf6fb-f7bb-45c2-a019-05f882cd4b5e-reusing-metrics-with-different-configurations.png)

## Example 1: Multiple LLM-as-Judge Metrics

A common use case is using the LLM-as-Judge Metric multiple times to evaluate different aspects of your outputs:

### Evaluating a Customer Service Response

You might add three instances of the LLM-as-Judge Metric:

1. **Tone Evaluation** - Configured to check if the response is polite and empathetic
2. **Accuracy Evaluation** - Configured to verify that the information provided is correct
3. **Completeness Evaluation** - Configured to ensure all parts of the customer query were addressed

## Example 2: Evaluating Different Fields in JSON Output

Another powerful use case is using the same Code Execution Metric multiple times to evaluate different fields within a structured JSON output.

### Evaluating a Product Recommendation JSON

Imagine your LLM generates a product recommendation in JSON format with multiple nested fields:

```json
{
  "recommendation": {
    "product": {
      "name": "Ultra Comfort Mattress",
      "price": 899.99,
      "features": ["memory foam", "cooling gel", "hypoallergenic"]
    },
    "reasoning": {
      "customer_needs": ["back pain", "overheating at night"],
      "product_benefits": "The cooling gel layer addresses nighttime overheating while the memory foam provides support for back pain."
    },
    "alternatives": [
      {
        "name": "Ergonomic Support Mattress",
        "price": 799.99
      }
    ]
  }
}
```

You can create a single Code Execution Metric that extracts and evaluates a specific field based on a provided key path:

```python
def main(completion, target, key_path):
    """
    Evaluates a specific field in a JSON output based on a provided key path.
    
    Args:
        completion: The JSON output from the LLM
        target: The expected value for the specified field
        key_path: Dot-notation path to the field to evaluate (e.g., "recommendation.product.name")
    
    Returns:
        Dictionary with score (1.0 if match, 0.0 if no match)
    """
    import json
    
    try:
        # Parse the completion JSON
        data = json.loads(completion)
        
        # Navigate to the specified field using the key path
        keys = key_path.split('.')
        actual_value = data
        for key in keys:
            if isinstance(actual_value, dict):
                actual_value = actual_value.get(key, None)
            else:
                return {"score": 0.0, "reason": f"Could not navigate to {key} in {actual_value}"}
        
        # Compare with target value
        if actual_value == target:
            return {"score": 1.0, "reason": f"Field {key_path} matches expected value"}
        else:
            return {"score": 0.0, "reason": f"Field {key_path} value '{actual_value}' does not match expected '{target}'"}
    
    except Exception as e:
        return {"score": 0.0, "reason": f"Error evaluating JSON: {str(e)}"}
```

Then, you can add this same Metric multiple times to your test suite with different configurations:

1. **Product Name Validation**
   * Rename to: "Product Name Check"
   * Inputs:
     * `completion`: `output` *the Prompt or Workflow output*
     * `target`: `expected_output` *would resolve to "Ultra Comfort Mattress"*
     * `key_path`: "recommendation.product.name" *a constant*

2. **Price Validation**
   * Rename to: "Price Check"
   * Inputs:
     * `completion`: `output` *the Prompt or Workflow output*
     * `target`: `expected_output` *would resolve to 899.99*
     * `key_path`: "recommendation.product.price" *a constant*

3. **Features Validation**
   * Rename to: "Features Check"
   * Inputs:
     * `completion`: `output` *the Prompt or Workflow output*
     * `target`: `expected_output` *would resolve to \["memory foam", "cooling gel", "hypoallergenic"]*
     * `key_path`: "recommendation.product.features" *a constant*

This approach allows you to reuse the exact same code while evaluating different aspects of your JSON output by simply changing the input parameters. It's a powerful pattern that reduces duplication and makes your evaluation more maintainable.

Learn more about setting and using Expected Outputs in [Quantitative Evaluation](/product/evaluation/quantitative-evaluation).

## Best Practices

When reusing Metrics in your test suites:

* **Use clear, descriptive names** for each Metric instance
* **Keep configurations focused** on specific aspects rather than trying to evaluate too many things at once
* **Review results separately** for each Metric instance to understand which specific aspects of your outputs need improvement
* **Design Metrics to be reusable** by parameterizing the aspects that will change between instances

## Conclusion

Reusing Metrics with different configurations provides a powerful way to perform multi-dimensional evaluation of your LLM outputs. By applying the same Metric type in different ways, you can gain deeper insights into the quality and correctness of your AI-generated content.