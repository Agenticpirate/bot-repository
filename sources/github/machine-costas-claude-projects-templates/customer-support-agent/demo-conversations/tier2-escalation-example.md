# Demo Conversation: Escalation Example

This example shows how the Customer Support Agent recognizes when to escalate and how to handle the escalation properly.

---

## Scenario: Billing Dispute

**Customer Type:** Premium plan user  
**Issue Complexity:** Tier 2 (requires human judgment)  
**Sentiment:** Frustrated and concerned  
**Expected Outcome:** Proper escalation to billing team

---

### Conversation

**Customer:**
I was charged $599 for an annual plan but I only wanted monthly. I never authorized this charge and I need a refund immediately.

---

**AI Agent:**
I understand this is concerning - unexpected charges are stressful, and I want to help you get this sorted out right away.

Let me take a look at your account to see what happened. Can you confirm your account email address so I can pull up your billing history?

---

**Customer:**
sarah.martinez@techcorp.com

---

**AI Agent:**
Thank you, Sarah. I can see your account, and you're right - there was a charge of $599 for an annual Premium plan on [date].

Looking at your account history, I can see that this charge came through, but I want to make sure we handle this properly. Billing disputes, especially for annual plans, need to be reviewed by our billing team to ensure you get the right resolution.

Here's what I'm going to do:

I'm escalating this to our billing specialist team right now. They'll:
- Review the full transaction details
- Check what happened at checkout
- Process the appropriate refund if this was an error
- Reach out to you within 1 hour (they're treating this as high priority)

They may also be able to convert you to the monthly plan retroactively if that's what you prefer.

I'm flagging this as urgent since I can see this just happened and you need it resolved quickly.

Is there anything else I should note for the billing team about this situation?

---

**Customer:**
Yes - I specifically remember clicking on the monthly option. I have a screenshot of the monthly plan page if they need it.

---

**AI Agent:**
Perfect - that screenshot will be really helpful! When the billing team reaches out (within the hour), please share that with them. It'll help them understand exactly what happened.

They'll contact you at sarah.martinez@techcorp.com. Would you also like them to call you? If so, what's the best number to reach you?

---

**Customer:**
No, email is fine. But I really need this resolved today.

---

**AI Agent:**
Absolutely understood. I've marked this as same-day resolution required. The billing team will prioritize this and get back to you within the hour with a solution.

In the meantime, is there anything else I can help you with?

---

**Customer:**
No, I just need this refund processed.

---

**AI Agent:**
Got it. The billing team will take care of you - they'll have full context on the situation and the authority to process the refund. You should hear from them very soon.

Thanks for your patience, Sarah!

---

**[INTERNAL ESCALATION NOTE]**

**PRIORITY: High**

**ISSUE SUMMARY:**
Customer was charged $599 for annual Premium plan but intended to purchase monthly plan ($49/month). Customer believes this was a system error during checkout.

**ACCOUNT DETAILS:**
- Name: Sarah Martinez
- Email: sarah.martinez@techcorp.com
- Account ID: #PM-47291
- Current Plan: Premium Annual
- Charge Date: [date]
- Amount: $599

**CUSTOMER EVIDENCE:**
- Customer has screenshot of monthly plan page during checkout
- Customer explicitly states she selected monthly option
- Request screenshot when contacting customer

**TROUBLESHOOTING ATTEMPTED:**
- Verified charge in account history
- Confirmed customer's recollection of events
- Determined this requires billing team review (outside AI agent scope)

**CUSTOMER SENTIMENT:**
- Frustrated but professional
- Concerned about unauthorized charge
- Needs same-day resolution
- Prefers email contact

**RECOMMENDED ACTION:**
1. Review checkout flow logs for this transaction
2. Verify which plan option was selected vs. charged
3. Process full refund if customer's claim is verified
4. Consider offering monthly plan conversion retroactive to charge date
5. Investigate if this is a checkout UI bug affecting other customers

**URGENCY JUSTIFICATION:**
- Recent charge (still within refund window)
- Customer explicitly needs same-day resolution
- Premium customer (higher priority)
- Potential system bug if customer's claim accurate

**RESOLUTION TIMELINE:**
Committed to customer: Response within 1 hour, resolution same day

**CUSTOMER CONTACT:**
Email: sarah.martinez@techcorp.com
Phone: [Not provided - customer prefers email]

**NEXT STEPS:**
Billing team to contact customer within 1 hour with resolution plan.

---

## Analysis

**Why this was escalated:**

✅ **Billing dispute over threshold amount** ($599 > $500 threshold)  
✅ **Requires human judgment** (checkout intent vs. actual charge)  
✅ **Refund authority** (AI agent cannot approve $599 refund)  
✅ **Potential systemic issue** (may indicate checkout bug)  
✅ **Premium customer** (higher priority tier)

**What the AI agent did well:**

- ✅ Quickly acknowledged the concern
- ✅ Verified account details
- ✅ Looked up the charge to confirm
- ✅ Explained why escalation was necessary
- ✅ Set clear expectations (within 1 hour)
- ✅ Collected valuable information (screenshot)
- ✅ Confirmed contact preferences
- ✅ Marked as urgent/same-day
- ✅ Provided comprehensive escalation notes

**Escalation note quality:**

The escalation note includes:
- Clear issue summary
- All relevant account details
- What was already attempted
- Customer sentiment assessment
- Recommended actions for billing team
- Urgency justification
- Timeline commitment
- Next steps

**Tone throughout:**

- Empathetic but professional
- Action-oriented
- Transparent about process
- Confident in resolution
- Respectful of customer's time

---

## What NOT to Do (Bad Example)

**❌ Poor Response:**

"I'm sorry, but I can't help with billing issues. You'll need to contact our billing department at billing@company.com. Our policy states that refunds for annual plans are only available within 30 days of purchase."

**Why this is bad:**
- Doesn't acknowledge customer's frustration
- Passes the buck without helping
- Makes customer do all the work
- Doesn't verify the charge happened
- Immediately cites policy defensively
- No timeline for resolution
- No context provided to billing team

---

## Alternative Scenario: Immediate Escalation

**If the customer had been more aggressive:**

**Customer:**
I was charged $599 for an annual plan and I never authorized this! This is fraud! I'm calling my credit card company right now if you don't fix this immediately!

**AI Agent:**
I completely understand why you're upset - an unexpected charge like this is very concerning. Let me connect you with our billing team immediately so we can get this resolved right now.

I'm escalating this as critical priority to our billing manager. They handle disputes like this and have the authority to process refunds immediately.

They'll reach out within 15 minutes. To help speed things up, do you have:
- Your account email
- The last 4 digits of the card charged
- Any screenshot or confirmation of what plan you intended to purchase

I want to make sure they have everything they need to resolve this the moment they contact you.

**[INTERNAL ESCALATION NOTE]**

**PRIORITY: CRITICAL**

**ISSUE:** Unauthorized annual plan charge - customer threatening chargeback

[Rest of escalation details...]

**URGENCY:** Customer very upset, threatening credit card dispute. Immediate response required to prevent chargeback.

---

## Key Takeaways

1. **Escalate early** when issue is beyond your scope - don't try to solve what you can't
2. **Be transparent** - Explain why you're escalating
3. **Set expectations** - Give specific timeframes
4. **Collect information** - Make it easy for the next team
5. **Stay calm** - Even if customer is upset
6. **Document thoroughly** - Comprehensive notes = faster resolution
7. **Show empathy** - Acknowledge the impact on the customer
8. **Follow protocols** - Billing disputes have specific thresholds and procedures

---

**Use this scenario to test escalation protocols with your support agent.**
