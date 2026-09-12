# Escalation Protocols

This document defines when and how to escalate customer issues to human support agents.

---

## Priority Levels

### Critical (Escalate Immediately - Within 5 Minutes)

**Characteristics:**
- Service outage affecting business operations
- Security breach or suspected account compromise
- Data loss or corruption
- Payment processing failures
- Customer safety concerns
- Legal threats or compliance issues
- Media/PR-sensitive situations

**Escalation Action:**
- Flag as CRITICAL
- Immediately notify on-call support manager
- Provide all available context
- Stay engaged until human agent takes over

**Example scenarios:**
- "Your service is down and we're losing thousands per hour"
- "I think my account was hacked"
- "Customer data appears to be exposed"
- "I'm going to report this to [regulatory body]"

---

### High (Escalate Within 1 Hour)

**Characteristics:**
- Billing disputes over $[THRESHOLD]
- Angry or extremely frustrated customers
- Complex technical issues requiring deep troubleshooting
- Enterprise customer requests
- Account access locked
- Repeated failed troubleshooting attempts
- Multiple interconnected issues

**Escalation Action:**
- Flag as HIGH priority
- Route to appropriate specialist team
- Provide detailed context and history
- Set customer expectation for response time

**Example scenarios:**
- "I've been charged incorrectly for 3 months"
- "I've tried everything and nothing works"
- "This is unacceptable, I want to speak to a manager"
- "[Enterprise customer name] reporting an issue"

---

### Medium (Escalate Within 4 Hours)

**Characteristics:**
- Feature requests requiring product team input
- Integration or API questions beyond basic troubleshooting
- Questions about future product plans
- Requests for custom arrangements or exceptions
- Account modifications requiring human approval
- Issues affecting business operations but with workarounds

**Escalation Action:**
- Flag as MEDIUM priority
- Route to specialist queue
- Document full conversation history
- Provide workarounds if available

**Example scenarios:**
- "Can you build this custom integration for us?"
- "We need a custom contract with different terms"
- "When will [specific feature] be available?"
- "Can you make an exception to your policy for us?"

---

### Low (Escalate Within 24 Hours)

**Characteristics:**
- General feedback or feature suggestions
- Questions requiring research or policy clarification
- Educational requests beyond standard documentation
- Partnership or business development inquiries
- Non-urgent account changes

**Escalation Action:**
- Document in support system
- Route to appropriate team queue
- Customer doesn't need immediate response
- Follow up within stated timeframe

**Example scenarios:**
- "Have you considered adding [feature]?"
- "I have some general feedback about the product"
- "Are you interested in partnership opportunities?"
- "Can you explain your data retention policy in detail?"

---

## Automatic Escalation Triggers

**Always escalate when customer:**
- Uses profanity or threatening language
- Explicitly requests to speak with a human or manager
- Mentions competitors or cancellation (churn risk)
- References legal action or complaints to authorities
- Describes an issue 3+ times without resolution
- Is a VIP or enterprise customer (flagged account)
- Sends follow-up after 24+ hours with no resolution

**Always escalate for topics involving:**
- Custom pricing or contract negotiations
- Refunds over $[AMOUNT]
- Account ownership disputes
- GDPR/privacy data requests (deletion, access, portability)
- Suspected fraud or abuse
- Service outages or degraded performance
- Unannounced features or bugs

---

## Escalation Process

### Step 1: Assess the Situation

Before escalating, confirm:
- ✅ Issue is clearly documented
- ✅ You've attempted standard troubleshooting
- ✅ You've checked knowledge base thoroughly
- ✅ Customer information is collected
- ✅ Priority level is identified

### Step 2: Inform the Customer

**What to say:**

"I want to make sure you get the best possible help with this. Let me connect you with [specialist type] who can [specific benefit]. They'll be able to [what they can do that you cannot]."

**High-priority issues:**
"I'm escalating this to our [team] right away. They'll reach out within [timeframe] to [resolve/investigate/assist]."

**Be specific about timing:**
- Critical: "Within 15 minutes"
- High: "Within the hour"
- Medium: "By end of business day"
- Low: "Within 24 hours"

### Step 3: Document Thoroughly

Include in escalation notes:

**Issue Summary**
- Brief description (1-2 sentences)
- Primary customer concern
- Business impact if applicable

**Customer Information**
- Name and account ID
- Contact preferences
- Account status/type (VIP, enterprise, etc.)
- Previous ticket history (if relevant)

**Troubleshooting Attempted**
- Steps already tried
- Results of each attempt
- Error messages or screenshots received

**Customer Sentiment**
- Satisfaction level (frustrated, neutral, angry)
- Urgency from customer perspective
- Any special circumstances

**Recommended Action**
- Your suggested next steps
- Information that still needs to be gathered
- Relevant knowledge base articles

**Format Example:**
```
PRIORITY: High
ISSUE: Customer unable to access account after password reset
ACCOUNT: john.doe@company.com (#12345)
STATUS: Premium customer, active 2 years

ATTEMPTED:
- Verified email address correct
- Sent 3 password reset emails (confirmed delivered)
- Tested reset link functionality (working for test account)
- Cleared browser cache (customer confirmed)

SENTIMENT: Frustrated, needs access urgently for client presentation

RECOMMENDED: Check for account-specific flag or restriction; verify email server not blocking; possibly manually reset on backend

RELEVANT KB: Article #234 (Password Reset Issues)
```

### Step 4: Follow-Up

After escalating:
- Confirm escalation was received
- Monitor for response
- If high/critical and no response in [timeframe], escalate further
- Update customer if delays occur

---

## Team Routing Guide

### Technical Support Team
- Complex product issues
- Integration problems
- API questions
- Bug reports
- Performance issues

### Billing Team
- Payment disputes
- Refund requests over $[AMOUNT]
- Invoice questions
- Subscription changes requiring approval
- Payment method failures

### Account Management
- Enterprise customers
- VIP accounts
- Churn prevention (cancellation threats)
- Upsell opportunities
- Strategic partnership discussions

### Product Team
- Feature requests with business case
- Beta program questions
- Product feedback requiring deep dive
- User experience issues affecting many customers

### Legal/Compliance
- GDPR requests
- Subpoenas or legal orders
- Terms of service violations
- Copyright/IP issues
- Privacy concerns

### Executive Team
- PR-sensitive issues
- Social media complaints with large following
- Repeated unresolved escalations
- Major business customers at risk

---

## De-escalation Techniques

Before escalating, try these approaches:

### For Frustrated Customers
1. **Acknowledge emotion**: "I can hear this has been frustrating"
2. **Take ownership**: "Let me make this right for you"
3. **Provide specific timeline**: "Here's exactly what I'll do..."
4. **Offer compensation**: (if within your authority) "I'd like to credit your account..."

### For Complex Issues
1. **Break it down**: "Let's tackle this one piece at a time"
2. **Set expectations**: "This will take about [X] minutes to resolve"
3. **Explain why**: "Here's what's happening and why..."
4. **Check understanding**: "Does this make sense so far?"

### For Urgent Requests
1. **Prioritize**: "I'm treating this as urgent and focusing on it now"
2. **Give updates**: "I'm checking on this right now... [pause] ... okay, here's what I found"
3. **Offer alternatives**: "While we work on the main issue, here's a temporary solution"

---

## Red Flags - Do Not Engage, Escalate Immediately

- Threats of violence or harm
- Extremely abusive language
- Attempts to socially engineer access to other accounts
- Requests for information about other customers
- Attempts to get you to break security protocols
- Phishing or scam attempts impersonating customers

**Action:** 
1. Document everything
2. Escalate to security team
3. Do not continue conversation
4. Follow incident response protocol

---

## Success Metrics for Escalations

**Good escalations:**
- Contain all necessary context
- Are routed to correct team
- Have clear priority level
- Set appropriate customer expectations
- Are escalated at the right time (not too early, not too late)

**Escalation quality is measured by:**
- First-touch resolution rate by receiving team
- Time to resolution after escalation
- Customer satisfaction scores
- Whether escalation was necessary (audit random sample)

---

## When NOT to Escalate

Don't escalate if:
- Answer is clearly in FAQ or knowledge base
- You haven't tried basic troubleshooting
- It's a simple request within your capability
- Customer just wants to vent (let them, then solve)
- Issue is normal processing time (set expectations instead)

**Remember:** Unnecessary escalations waste specialist time and slow down response for urgent issues.

---

**Questions about escalation protocols?** Contact your support team lead or manager.

**Last updated:** [Date]
