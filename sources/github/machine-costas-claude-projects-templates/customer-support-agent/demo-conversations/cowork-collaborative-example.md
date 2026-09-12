# Demo Conversation: Cowork Mode Example

This example shows how the Customer Support Agent can work collaboratively with a human agent using Claude's Cowork mode for complex escalations.

---

## Scenario: Complex Technical Issue Requiring Real-Time Collaboration

**Customer Type:** Enterprise customer  
**Issue Complexity:** Tier 3 (requires both AI and human expertise)  
**Sentiment:** Professional but urgent  
**Mode:** Cowork (AI + Human Agent working together)  
**Expected Outcome:** Collaborative problem-solving with faster resolution

---

## How Cowork Mode Works

**Traditional Escalation Flow:**
1. AI collects information
2. AI escalates to human
3. Human takes over completely
4. Customer repeats context to human

**Cowork Mode Flow:**
1. AI and human work simultaneously
2. AI handles data gathering and documentation
3. Human provides judgment and expertise
4. Seamless handoff - no repeated context
5. AI assists human during resolution

---

### Conversation with Cowork

**Customer:**
We're experiencing a critical issue with the API integration. Our production system is getting 503 errors on all requests to /api/v2/sync endpoint. This is blocking our customer onboarding flow. We need this resolved urgently - we have 40+ customers waiting.

---

**AI Agent:**
This is definitely urgent - I'm treating this as critical priority. Let me gather the key details while I loop in our technical team.

Quick questions while we get you connected:
1. When did this start? (Approximate time)
2. What's your API key prefix? (First 4 characters only)
3. Which region are you calling? (US, EU, APAC)
4. Are you getting 503s on all endpoints or just /sync?

---

**Customer:**
Started about 30 minutes ago (around 2:15pm EST). API key starts with "sk_p". We're using US region. It's only the /sync endpoint - everything else works fine.

---

**AI Agent:**
Thanks - that's really helpful. I'm pulling up your API logs now and I can see the 503 errors starting at 2:14pm EST. 

I'm bringing in Alex from our technical team right now in Cowork mode - he can see everything we've discussed and has access to backend systems to diagnose this.

[COWORK MODE ACTIVATED - Human Agent: Alex joined]

---

**Alex (Human Agent):**
Hi, I'm Alex from our technical team. I can see the context - definitely seeing the spike in 503s on your account. Let me check our sync service health.

---

**AI Agent** [assisting Alex]:
While Alex investigates, I'm checking:
- Your recent API usage patterns (no unusual spike)
- Service status (no reported outages on status page)
- Other customers hitting same endpoint (checking if it's systemic)

Your error rate: 100% on /api/v2/sync for the last 30 minutes  
Average response time before errors: ~200ms (normal)  
Last successful sync: 2:13pm EST

---

**Alex (Human Agent):**
Found it - we're seeing a partial outage on one of our sync service clusters. Your API key is being routed to the affected cluster. This is affecting about 8% of sync requests across all customers.

I'm going to:
1. Manually reroute your traffic to healthy clusters (takes ~2 minutes)
2. File an incident for the affected cluster
3. Monitor your requests to confirm resolution

Give me just a moment...

---

**AI Agent** [to customer while Alex works]:
Alex is working on the fix right now. Here's what's happening:

**Issue:** Your requests are being routed to a cluster that's having issues
**Impact:** Only /sync endpoint affected (your other API calls are fine)
**Fix:** Rerouting your traffic to healthy servers
**ETA:** About 2 minutes for your requests to start succeeding

Your other endpoints aren't affected, so any non-sync operations should work normally if you need to proceed with those while we fix this.

---

**Alex (Human Agent):**
Okay, I've rerouted your API key. Can you try a test request to /api/v2/sync now?

---

**Customer:**
Testing... yes! It's working now. Getting 200s.

---

**Alex (Human Agent):**
Perfect. I'm monitoring your requests in real-time and they're all succeeding now. You should be good to proceed with your customer onboarding.

---

**AI Agent** [documenting and following up]:
Great news! Here's what we did:

**Problem:** Partial sync service outage affecting your cluster  
**Solution:** Rerouted your API traffic to healthy clusters  
**Resolution time:** 8 minutes from your initial message  
**Status:** Monitoring to ensure continued stability  

**Next steps:**
- We're fixing the underlying cluster issue (shouldn't affect you now)
- You'll see a post-mortem on our status page within 24 hours
- Alex will monitor your account for the next hour to make sure everything stays stable

For the customers who were waiting:
- They can proceed immediately
- All data is intact (no sync loss during the outage)
- Historical syncs will process normally

Is there anything else you need from us? We'll keep monitoring your account.

---

**Customer:**
No, that's perfect. Thanks for the fast response - really appreciate it.

---

**Alex (Human Agent):**
Of course. I'll follow up in an hour to confirm everything's stable. Feel free to reach out directly if you see any other issues - I've added a note to your account to prioritize any tickets today.

---

**AI Agent:**
Thanks for your patience! We know how critical this was for your onboarding flow. Don't hesitate to reach out if you need anything else.

---

## Analysis: Why Cowork Mode Was Effective

**Benefits over traditional escalation:**

✅ **Faster context transfer** - Human agent saw entire conversation history immediately  
✅ **No information re-gathering** - Customer didn't need to repeat details  
✅ **Parallel processing** - AI gathered logs while human investigated backend  
✅ **Real-time updates** - AI kept customer informed while human worked  
✅ **Better documentation** - AI summarized resolution automatically  
✅ **Smoother experience** - Felt like one team, not a handoff  

**Time saved:**
- Traditional escalation: ~15-20 minutes (context transfer, repeat info)
- Cowork mode: ~8 minutes (immediate collaboration)
- **Time saved: 7-12 minutes on critical issue**

**What each participant did:**

**AI Agent:**
- Initial triage and information gathering
- Pulled historical data and logs
- Kept customer informed during investigation
- Documented resolution
- Handled follow-up communication

**Human Agent (Alex):**
- Backend system investigation
- Root cause diagnosis
- Technical fix implementation
- Real-time monitoring
- Expertise-requiring decisions

**Customer:**
- Provided key details once
- Received real-time updates
- Confirmed resolution
- No repeated explanations

---

## Cowork Mode Best Practices

### When to Use Cowork Mode

✅ **Complex technical issues** requiring both context and expertise  
✅ **High-value customer** situations needing white-glove service  
✅ **Critical/urgent issues** where time matters  
✅ **Training scenarios** where junior agents need support  
✅ **Multi-step resolutions** requiring coordination  

### When NOT to Use Cowork Mode

❌ Simple FAQ questions (AI can handle alone)  
❌ Standard escalations (traditional handoff is fine)  
❌ Issues requiring complete human takeover (angry customers, sensitive topics)  
❌ When customer explicitly requests "human only"  

### AI's Role in Cowork

1. **Information gathering** - Collect details efficiently
2. **Documentation** - Keep comprehensive notes in real-time
3. **Data retrieval** - Pull logs, history, account details
4. **Customer communication** - Provide updates while human works
5. **Process adherence** - Ensure protocols are followed
6. **Follow-up** - Handle post-resolution documentation

### Human's Role in Cowork

1. **Expert judgment** - Make decisions AI can't
2. **Technical execution** - Perform backend fixes
3. **Customer relationship** - Build trust and rapport
4. **Complex diagnosis** - Investigate root causes
5. **Policy exceptions** - Authorize special handling
6. **Final accountability** - Own the resolution

---

## Setting Up Cowork Mode

**In your Claude Project:**

1. Enable Cowork in Project settings
2. Add human agent access
3. Configure notification preferences
4. Set escalation triggers for Cowork activation

**Cowork Triggers:**
- Enterprise customer issues
- Critical/high priority flags
- Complex technical problems
- Issues requiring backend access
- Customer requests for senior support

**Training for Human Agents:**
- Review AI conversation before joining
- Use AI's gathered data
- Let AI handle routine updates
- Focus on expertise-requiring tasks
- Coordinate seamlessly with AI

---

## ROI of Cowork Mode

**Metrics:**
- **30-50% faster resolution** on complex issues
- **Reduced customer effort** (no context repetition)
- **Better documentation** (AI tracks everything)
- **Improved CSAT** (seamless experience)
- **Agent efficiency** (human focuses on high-value work)

**Cost Savings:**
- Traditional: 20 minutes average for complex technical issue
- Cowork: 8-12 minutes average
- **Savings: 40-60% reduction in handle time**
- **Scale:** 10 complex issues/day = 100+ minutes saved daily

---

## Implementation Checklist

- [ ] Enable Cowork mode in Claude Project settings
- [ ] Train human agents on Cowork collaboration
- [ ] Define clear triggers for Cowork activation
- [ ] Set up notification system for agent availability
- [ ] Create documentation on AI/human responsibilities
- [ ] Establish escalation protocols within Cowork
- [ ] Monitor and measure Cowork performance metrics
- [ ] Gather feedback from agents and customers
- [ ] Iterate on triggers and protocols

---

**Ready to implement Cowork mode? See `advanced-cowork-setup.md` for detailed configuration instructions.**
