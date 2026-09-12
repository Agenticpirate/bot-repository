# Demo Conversation: Tier 1 Support Example

This example shows how the Customer Support Agent handles a standard tier 1 support request.

---

## Scenario: Password Reset Issue

**Customer Type:** Standard plan user  
**Issue Complexity:** Tier 1 (standard troubleshooting)  
**Sentiment:** Slightly frustrated  
**Expected Outcome:** Issue resolved without escalation

---

### Conversation

**Customer:**
Hi, I'm trying to reset my password but I'm not getting the reset email. I've been waiting for like 20 minutes.

---

**AI Agent:**
Hi there! I'm sorry you're not receiving the reset email - let's get you back into your account right away.

First, let me check a couple quick things:

1. Can you confirm the email address you're using? (Just want to make sure it matches your account email)
2. Have you checked your spam/junk folder? These emails sometimes land there

While you're checking that, let me also verify that our email system is working properly on our end.

---

**Customer:**
Yeah it's john.doe@gmail.com and I checked spam, nothing there.

---

**AI Agent:**
Thanks for confirming! I see your account is registered to john.doe@gmail.com, so that's correct. Our email system is operating normally, so let's try a different approach.

I'm going to trigger a new reset email for you right now. Before I do, can you:

1. Make sure john.doe@gmail.com is not blocking emails from @[company-domain].com
2. If you use Gmail's tabs feature, check your "Updates" or "Promotions" tab

Okay, I've just sent a fresh reset link to john.doe@gmail.com. It should arrive within 1-2 minutes. Can you check your inbox (and spam folder again) and let me know if you see it?

**Note:** The link expires in 24 hours for security.

---

**Customer:**
Oh! It just came through. Got it, thanks.

---

**AI Agent:**
Excellent! Glad that worked. 

Once you reset your password:
- Make sure to save it somewhere secure
- If you have our mobile app, you'll need to log in again there too

Pro tip: You can enable two-factor authentication in your settings for extra security.

Is there anything else I can help you with today?

---

**Customer:**
No that's it, thanks!

---

**AI Agent:**
You're very welcome! Feel free to reach out if you need anything else. Have a great day!

---

## Analysis

**What went well:**
- ✅ Quick acknowledgment of frustration
- ✅ Immediate action orientation
- ✅ Asked for key information (email address)
- ✅ Checked common issues (spam folder)
- ✅ Provided clear next steps
- ✅ Set expectations (1-2 minutes)
- ✅ Added helpful tips (2FA suggestion)
- ✅ Closed with offer for additional help

**Tone notes:**
- Professional but friendly
- Empathetic without over-apologizing
- Action-focused
- Clear and concise

**No escalation needed because:**
- Issue was in knowledge base scope
- Standard troubleshooting resolved it
- Customer was satisfied
- No special circumstances

**Time to resolution:** ~3 minutes  
**Messages exchanged:** 5  
**Customer satisfaction:** High (implied by positive tone)

---

## Alternative Scenarios

### If Email Still Didn't Arrive

**Customer:**
Still nothing. This is really frustrating.

**AI Agent:**
I understand, and I apologize for the continued delay. This isn't typical, so let me escalate this to our technical team who can check if there's something blocking emails to your address specifically.

They'll reach out within the next hour to get you back into your account. In the meantime, they may be able to manually reset your password.

I've marked this as high priority. Is there an alternative email address where we can reach you if needed?

[INTERNAL ESCALATION NOTE]
Issue: Password reset emails not delivering to john.doe@gmail.com
Attempted: Multiple reset requests, confirmed email address, checked spam
Verified: User checking correct email, no typos
System Status: Email service operational
Customer Sentiment: Frustrated but patient
Recommended: Check email delivery logs, possible domain block on recipient side, manual password reset
Priority: High

---

### If Customer Was More Frustrated Initially

**Customer:**
This is ridiculous! I need to get into my account NOW and I can't believe your system doesn't work!

**AI Agent:**
I completely understand your frustration - not being able to access your account is incredibly disruptive. Let me prioritize getting you back in right now.

Give me just one minute to check your account status and trigger a fresh reset email directly. I'm on this.

[Checks system, sends new reset]

Okay, I've just sent a new reset link to john.doe@gmail.com and I've also verified our email system is working. The email should arrive within 1-2 minutes.

While we wait for that: have you checked your spam/junk folder? These sometimes land there. Also, if you use Gmail tabs, check your "Updates" or "Promotions" tab.

Can you check those and let me know if the email appears? If not within 2 minutes, I'll escalate this immediately to our tech team for a manual reset.

---

## Key Takeaways

1. **Acknowledge first, troubleshoot second** - Customer needs to feel heard
2. **Give clear timeframes** - "Within 1-2 minutes" is better than "shortly"
3. **Check common issues first** - Spam folder, wrong email, etc.
4. **Provide context** - Explain why you're asking questions
5. **End positively** - Additional tips and offers for further help
6. **Know when to escalate** - If standard troubleshooting fails

---

**Use this template to test your Claude support agent with similar scenarios.**
