> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Deployment Release Reviews

> Learn how to implement a formal review process for your Prompt and Workflow Deployments using Vellum's Release Reviews feature.

## Introduction to Release Reviews

Vellum's Deployment Release Reviews feature brings the familiar process of code reviews to your AI systems.
Inspired by GitHub PR reviews, this feature allows team members to review, approve, or request changes to Prompt and
Workflow Deployments, before they're promoted to critical environments.

Release Reviews help ensure quality control and provide an audit trail of approvals, which is particularly valuable for teams that:

* Need to comply with governance requirements
* Want to enforce quality standards for AI systems
* Have multiple stakeholders involved in AI development
* Require sign-off before changes reach production

Here's a quick demo of it in action.

## How Release Reviews Work

The Release Reviews process follows a familiar workflow:

1. **Deploy a Prompt or Workflow**: Create a Release to a Deployment as you normally would
2. **Request Review**: Notify team members that a Deployment Release is ready for review
3. **Review Process**: Reviewers examine the changes and provide feedback
4. **Approval or Change Requests**: Reviewers either approve the Release or request specific changes
5. **Promotion**: (Optional) Once approved, the Release can be assigned Release Tags

This process ensures that all changes to your AI systems undergo proper scrutiny before being used in critical environments.

## Protected Release Tags

Vellum allows you to designate certain Release Tags as "protected." This feature works in conjunction with Release
Reviews to ensure that critical Releases undergo proper review before going live.

![Protected Release Tags setting in organization advanced settings](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/be445940-4c27-4c8c-84d3-da728985a083-protected-release-tags-settings-updated.png)

A protected Release Tag cannot be assigned to a Prompt or Workflow Deployment Release unless that Release has at least one approval from a Reviewer and no outstanding change requests. This provides an additional layer of security for your most important deployments.

Protected Release Tags are particularly useful for:

* Production environments where changes need to be reviewed
* Critical systems where quality control is essential
* Complying with SOC-2 regulations
* Teams that want to enforce code review practices for AI systems

### Configuring Protected Release Tags

You can configure Protected Release Tags in your organization settings. Simply specify which Release Tags should be protected, and Vellum will enforce the review requirements automatically. Note that this is considered a Premium feature and is not available in Vellum's Free Tier.

![Protected Release Tags configuration modal showing Production and Staging tags](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/be445940-4c27-4c8c-84d3-da728985a083-protected-release-tags-modal.png)

Once configured, these protected tags can only be assigned to Releases that have been approved through the review
process.

## The Review Process

### Submitting a Deployment for Review

After creating or updating a deployment:

1. Navigate to the **Deployment Details** page
2. Select the **Releases** tab
3. Find the release you want to have reviewed
4. Click the **Request Review** button (optional but recommended)
5. Select team members to notify about the review request

### Reviewing a Deployment Release

As a reviewer:

1. Navigate to the **Deployment Details** page
2. Select the **Releases** tab
3. Find the Release that needs review
4. Click the **Write Review** button
5. Examine the changes in the deployment
6. Add your comments in the review panel
7. Choose to either **Approve** or **Request Changes**

When requesting changes, provide clear feedback about what needs to be modified. For now, you must notify the author
of the review you left outside of Vellum.

### Addressing Change Requests

If changes are requested:

1. Review the feedback provided by reviewers
2. Make the necessary adjustments to your prompt or workflow
3. Create a new release with the requested changes
4. Request a new review of the updated deployment

### Approving a Deployment

Once a Release has received the necessary approvals and has no outstanding change requests, Protected Release Tags
can be assigned to to it. To do this:

1. Navigate to the **Deployment Details** page
2. Select the **Releases** tab
3. Find the approved Release
4. Click on the pencil icon next to the **Release Tags** section
5. Select the Release Tag(s) you want to assign
6. Confirm the assignment

## Review Status and History

Each deployment release maintains a complete history of its review process, including:

* Who requested reviews
* Who reviewed the deployment
* What feedback was provided
* When approvals were granted
* Which release tags were assigned

This history provides valuable documentation for audit purposes and helps track the evolution of your AI systems over time.

## Conclusion

Deployment Release Reviews bring structured governance to your AI systems, ensuring that changes undergo proper scrutiny before reaching critical environments. By implementing a formal review process, you can improve the quality of your AI applications, maintain compliance with governance requirements, and provide an audit trail of approvals.

For more information about managing deployments and release tags, see [Managing Releases](/product/deployments/managing-releases).