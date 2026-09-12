# Common Technical Issues - Troubleshooting Guide

This guide helps support agents diagnose and resolve the most frequent technical problems customers encounter.

---

## Login & Account Access Issues

### Problem: "Invalid Credentials" Error

**Symptoms:** Customer gets "invalid credentials" or "incorrect password" message

**Troubleshooting Steps:**

1. **Verify email address**
   - Ask customer to copy-paste (not retype) their email
   - Check for extra spaces, typos, or similar-looking characters (0 vs O, 1 vs l)
   - Some customers have multiple accounts with slight variations

2. **Check account status**
   - Look up account in system
   - Status: Active / Locked / Suspended / Deleted?
   - Recent activity or failed login attempts?

3. **Password reset**
   - Send password reset email
   - Ask customer to check spam/junk folders
   - Reset link expires in 24 hours
   - If no email received after 5 minutes, check email deliverability

4. **Browser/cache issues**
   - Try different browser
   - Clear browser cache and cookies
   - Try incognito/private mode
   - Try different device

**Common Causes:**
- ✅ Typo in email or password
- ✅ Using old password (didn't notice reset confirmation)
- ✅ Caps Lock on
- ✅ Browser autofill using wrong password
- ✅ Account locked after failed attempts (unlocks after 30 min)

**Escalate if:**
- Account doesn't exist but customer insists they have one
- System shows successful login but customer still can't access
- Technical error messages (not credential-related)

---

### Problem: Password Reset Email Not Received

**Symptoms:** Customer requested password reset but didn't get email

**Troubleshooting Steps:**

1. **Check spam/junk folders** (80% of cases)
   - Ask customer to check carefully
   - Sometimes filtered to Promotions tab (Gmail)

2. **Verify email address**
   - Confirm email is spelled correctly
   - Check if account exists under that email
   - Customer might be using different email than they think

3. **Whitelist our domain**
   - Add [yourdomain.com] to safe senders
   - Some corporate email servers block automated emails

4. **Try alternative email**
   - If customer has multiple emails on file, try another
   - Can update email address if current one is inaccessible

5. **Manual reset** (last resort)
   - Senior agent can manually reset password
   - Send temporary password via verified channel
   - Customer must change on first login

**Escalate if:**
- Reset emails bounce back (email delivery issue)
- Multiple attempts from different emails all fail
- System error when triggering reset

---

## Payment & Checkout Issues

### Problem: Payment Declined

**Symptoms:** Customer's payment won't process, transaction fails at checkout

**Troubleshooting Steps:**

1. **Identify decline reason**
   - Check payment processor error code
   - Common codes:
     - Insufficient funds
     - Card expired
     - Incorrect billing address
     - Fraud prevention
     - Card not activated for international transactions

2. **Basic verification**
   - Confirm card number is correct (no typos)
   - Verify expiration date
   - Check CVV is correct
   - Confirm billing address matches card exactly

3. **Try alternative payment methods**
   - Different credit card
   - PayPal
   - Buy Now, Pay Later (Affirm) if eligible

4. **Bank authorization**
   - Ask customer to contact their bank
   - Some banks flag online purchases as suspicious
   - Customer may need to authorize the transaction
   - Some cards require notification for international purchases

5. **Browser/technical issues**
   - Try different browser
   - Disable browser autofill (can cause address mismatch)
   - Clear cookies and cache
   - Try on different device

**Common Causes:**
- ✅ Billing address doesn't match card exactly (even zip code matters)
- ✅ Bank's fraud prevention
- ✅ International card without international purchases enabled
- ✅ Prepaid card with insufficient balance
- ✅ Corporate card with restrictions

**Escalate if:**
- Payment should work but consistently fails
- Error message is unclear/technical
- Multiple payment methods all decline
- System-side payment processing error

---

### Problem: Order Confirmation Not Received

**Symptoms:** Customer completed purchase but didn't get confirmation email

**Troubleshooting Steps:**

1. **Verify payment processed**
   - Check if order exists in system
   - Confirm payment was captured (not just authorized)
   - Look up by email, name, or card last 4 digits

2. **Check email address**
   - Confirm email address in order (customer may have mistyped)
   - If wrong, update and resend confirmation

3. **Check spam/junk** (most common)
   - Order confirmations sometimes filtered
   - Ask customer to whitelist [yourdomain.com]

4. **Email delivery issue**
   - Some email providers block automated emails
   - Corporate email servers may reject
   - Can manually resend confirmation

**Resolution Options:**
- Resend confirmation to correct email
- Provide order number verbally/via chat for their records
- Screenshot order details and send via support ticket

**Escalate if:**
- Order appears stuck in "processing" with successful payment
- System shows confirmation sent but no evidence of payment
- Recurring issue with specific email domain

---

## Shipping & Tracking Issues

### Problem: Tracking Number Not Working

**Symptoms:** Customer has tracking number but it shows "not found" or no updates

**Troubleshooting Steps:**

1. **Check shipping status in system**
   - Order status: Processing / Shipped / Delivered?
   - Shipping date vs. current date
   - Carrier and service level

2. **Carrier delay in scanning**
   - Tracking numbers activate 24-48 hours after generation
   - Package may be in transit before first scan
   - First scan usually happens when carrier picks up

3. **Verify tracking number**
   - Check for typos in email
   - Some carriers use different formats
   - Try tracking on carrier's website directly

4. **Check correct carrier**
   - Customer may be checking wrong carrier's website
   - We use: USPS, FedEx, UPS (specify correct one)

**Timeline Expectations:**
- **Tracking number generated:** When label printed (order ships within 1-2 business days)
- **First scan:** Usually within 24 hours of leaving warehouse
- **In transit:** Updates every 1-2 days
- **Delivery:** Per shipping method selected

**Escalate if:**
- Tracking shows no movement for 5+ business days
- Package marked delivered but customer didn't receive
- Tracking indicates issue (damage, lost, return to sender)

---

### Problem: Package Shows Delivered But Not Received

**Symptoms:** Tracking says delivered, customer doesn't have package

**Troubleshooting Steps:**

1. **Verify delivery details**
   - Delivery date and time
   - Delivery location (front door, mailbox, neighbor, office)
   - Delivery photo if available (some carriers provide)

2. **Check thoroughly**
   - Ask customer to check:
     - All entrances (front, back, side doors)
     - Garage, porch, bushes
     - Behind security door or gate
     - Inside mailbox or package locker
     - With household members
     - Building mailroom or front desk
     - With neighbors

3. **Address verification**
   - Confirm shipping address was correct
   - Check for similar addresses nearby
   - Multi-unit buildings: unit number correct?

4. **Wait 24 hours**
   - Sometimes marked delivered early
   - Package may arrive same day or next day
   - Carrier may have delivered to wrong address and will self-correct

5. **If still not found after 24 hours:**
   - File carrier claim
   - Offer replacement or refund
   - Customer may need to file police report for insurance claim (high value items)

**Escalate immediately if:**
- High value item (>$500)
- Customer reports theft/security concerns
- Multiple delivery failures to same address
- Evidence of carrier error or fraud

---

## Website & App Issues

### Problem: Website Won't Load or Slow Performance

**Symptoms:** Customer can't access website or it's very slow

**Troubleshooting Steps:**

1. **Verify website status**
   - Check if site is down for everyone or just them
   - Use: [status.yourdomain.com] or internal status tool
   - If site-wide: provide estimated resolution time

2. **Customer-side issues** (most common):
   - **Clear cache and cookies**
     - Chrome: Settings → Privacy → Clear browsing data
     - Safari: Preferences → Privacy → Manage Website Data
   - **Try different browser**
   - **Try incognito/private mode**
   - **Disable browser extensions**
   - **Check internet connection**

3. **Geographic restrictions**
   - Some regions may have slower performance
   - VPN usage can affect speed/access
   - Content delivery varies by location

4. **Device-specific issues**
   - Try on different device
   - Update browser to latest version
   - Check device storage (full storage slows performance)

**Escalate if:**
- Site loads for others but consistently fails for customer
- Specific error codes (500, 503, etc.)
- Issue persists across multiple devices/networks
- Potential security issue or hack

---

### Problem: Can't Add Items to Cart or Checkout

**Symptoms:** Customer unable to complete purchase process

**Troubleshooting Steps:**

1. **Browser/cache issues**
   - Clear cookies and cache
   - Try incognito mode
   - Try different browser
   - Disable ad blockers and browser extensions

2. **Item availability**
   - Check if item is actually in stock
   - Some items have purchase limits
   - Regional restrictions may apply

3. **Account issues**
   - Customer logged in? Some features require account
   - Account in good standing (not suspended)?
   - Previous order issues or payment problems?

4. **Technical conflicts**
   - JavaScript disabled (re-enable)
   - Outdated browser (update)
   - Mobile app vs. website (try alternative)

5. **Try manual order**
   - If urgent, place order manually over phone
   - Take payment via phone (secure line only)
   - Email confirmation

**Escalate if:**
- Widespread issue (multiple customers reporting)
- Shopping cart consistently fails
- Payment processing errors
- Checkout bugs

---

## Account Management Issues

### Problem: Can't Update Account Information

**Symptoms:** Customer unable to change email, password, address, etc.

**Troubleshooting Steps:**

1. **Session/authentication issues**
   - Log out completely
   - Clear cookies
   - Log back in
   - Try saving changes again

2. **Verification required**
   - Some changes require email verification
   - Check spam for verification email
   - Verification link expires (send new one)

3. **Field validation errors**
   - Error messages indicating what's wrong?
   - Common: Invalid email format, password requirements not met, missing required field
   - Phone number format (include country code)

4. **Permission restrictions**
   - Some account types have restricted editing
   - Business accounts may require admin approval
   - Suspended accounts cannot make changes

**Manual Update:**
If customer cannot update themselves:
- Senior agent can manually update
- Requires verification (security questions, last order, etc.)
- Send confirmation of changes

**Escalate if:**
- System error preventing updates
- Account data corruption
- Security concerns (unauthorized access)

---

## Mobile App Issues

### Problem: App Crashing or Won't Open

**Symptoms:** App closes immediately or won't launch

**Troubleshooting Steps:**

1. **Basic fixes** (resolve 90% of issues):
   - Close app completely (force close)
   - Restart device
   - Check for app updates in App Store/Google Play
   - Update phone OS if available

2. **Storage issues**
   - Check device storage (full storage causes crashes)
   - Clear app cache (App settings → Storage → Clear cache)
   - If desperate: Uninstall and reinstall app (will lose saved data)

3. **Compatibility**
   - Check minimum OS requirements
   - Older devices may not support latest app version
   - Beta OS versions may have compatibility issues

4. **Network issues**
   - Some features require internet
   - Try WiFi vs cellular data
   - Check if app needs specific ports/permissions

**Escalate if:**
- Widespread reports of app crashes
- Specific app version causing issues
- Device-specific problem affecting many users

---

## When to Escalate Technical Issues

**Immediate escalation:**
- Security or privacy breaches
- Payment processing system down
- Site-wide outages
- Data corruption or loss

**Priority escalation:**
- Recurring issue with no solution
- Issue affects multiple customers
- Bug causing financial impact
- API or integration failures

**Standard escalation:**
- Edge case not in troubleshooting guide
- Requires developer investigation
- Feature requests or enhancements
- Complex account recovery

---

## Useful Troubleshooting Resources

**For Support Agents:**
- System status: [internal link]
- Known issues log: [internal link]
- Development team contact: [email/Slack]

**For Customers:**
- Help Center: [public link]
- Video tutorials: [link]
- Community forum: [link]

---

**Last Updated:** January 2025
**Questions?** Contact IT support team or post in #support-technical-help
