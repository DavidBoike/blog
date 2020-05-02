---
layout: post
date: 2011-04-12
title: 'NServiceBus Retries: Why no back-off delay?'
permalink: nservicebus-retries-why-no-back-off-delay
categories:
- Development
tags:
- NServiceBus
- architecture
comments: true
---
When presenting my [Distributed Application Development with NServiceBu](http://www.make-awesome.com/presentations/)s talk at the [Twin Cities Code Camp 10](http://www.twincitiescodecamp.com), I was asked by an attendee why NServiceBus's automated retry feature doesn't have some sort of a delay or back-off algorithm.  Unfortunately I had never really thought about it, and I didn't have a very good answer for him.

This week I have the good fortune to be attending [Udi Dahan's](http://www.udidahan.com) [Advanced Distributed System Design](http://www.udidahan.com/training/#Advanced_Distributed_System_Design) course in New York, so I thought I would get the answer direct from the source.

Udi gave me several good reasons why this is intentionally left out of NServiceBus.  I'll try to convey his answers and add my own thoughts as well.

<!-- more -->

### Why would you want a delay in the first place?

 I think the normal story would revolve around the assumption (perhaps incorrect) that if two threads experience transient exceptions (the canonical example being a database deadlock) and then both instantly retry, the same error is going to happen again.  Both messages will then go to the error queue, where if each had just waited to not step on each other's toes, there would have been no issue.

Of course if you wait the same amount of milliseconds on both threads, you're just as likely to have the same problem, right?  So this feature would also need to randomize the delay somehow, so that on successive retries, the two offenders are less likely to be bothersome.

Let's just assume for the moment that this is true.  Why might this not be a good thing?

### 1. Introducing a delay will slow down processing.

 Well duh, this seems rather obvious.  If a thread spends time sleeping, it is (by definition) not processing the next message. Obviously we don't want to build systems that go slower than the theoretical maximum **on purpose**. We want our systems to run as fast as possible. There are enough limitations imposed on us by the rest of the universe before we bother introducing our own.

But we could work around this, right?  We could make the delay zero by default.  We could make it configurable.  Then if we follow advice to have one message type processed per endpoint, we could effectively control the back-off on a per-message-type basis.

### 2. It overcomplicates things

 As I said before, not only would you need a delay, you'd need a delay that was configurable and randomized.  That's a lot of configuration for a fairly edge case.  Do we really need it?  We already have an error queue to deal with persistent errors.  We already have a tool to return error messages back to their source queue.  Why do we need a whole lot of other infrastructure when we already have good tools to deal with these issues?

### 3. It has no business value

 Let's face it.  No business stakeholder has come to you and said that we need a configurable randomized back-off mechanism in our messaging infrastructure. This is something that we as developers have thought up all on our own and adds no business value to the system.  So do we really need it?  Or should we stick with the simplest thing that works?

Now, there might be exceptions where a back-off mechanism can have business value and purpose.  Yves Goeleven explains how [a back-off mechanism can be valuable when dealing with Azure Message Queue](https://cloudshaper.wordpress.com/2010/11/06/operational-costs-of-an-azure-message-queue/), where every interaction with the Azure API costs you money.  In this situation (specifically when retrieving messages off the Azure queue) it doesn't make sense to ask the server if there are new messages as fast as possible, because we begin to pay through the nose to do nothing at all.

However, talking to local MSMQ is basically free.  Given that, let's do it as fast as possible.

### 4. It hides problems

 In my opinion, this is the best argument against a back-off mechanism, because it attacks the basic assumption that having semi-transient errors arriving in the error queue is a bad thing.

Why is that a bad thing exactly?

Exceptions aren't bad things.  Exceptions speak to us.  Some are a fact of life.  They will happen once in awhile, and our retry mechanism will take care of that.  The rest will arrive in the error queue, and then we can find the cause and deal with it.

So the issue seems to be that errors are showing up in the error queue that, for some reason, *we don't think should be there*.  Its very arrival has annoyed us in some way.  "That's a deadlock," we say, "and the retry should have taken care of that?"

Maybe instead we should ask ourselves why something supposedly so transient has made it through X retries and arrived in our error queue.  Maybe this means that a deadlock (or whatever the exception happens to be) is really more common than we think in this situation, and it deserves a closer look.

### There are other ways to deal with this

 We already have an error queue to deal with errors, and this is a queue like any other.  Let's use that to our advantage.

Let's say the error is not transient (within a short time window) but also not something we can "fix".  Maybe it's our client's fault.  Maybe they sent us an RSS feed with an image URL that we cannot download, because the client's server is down.

In this situation, an automated back-off of a few milliseconds probably isn't going to help anyway.  Maybe in 5 minutes or a half hour it will work, but certainly not 10-100ms later.

With a clear business case for an error condition in hand, we can create a handler on the error queue and take some business-appropriate action on that error message.  We could store it for a set amount of time and then return it to the source queue.  We could email the client that we're having difficulty and then swallow the message.  What we actually do doesn't matter; the point is that it is now a functional requirement with real business value, and we can implement it easily enough with existing tools.
