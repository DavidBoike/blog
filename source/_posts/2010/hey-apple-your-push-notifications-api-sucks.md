---
layout: post
date: 2010-10-19
title: Hey Apple, Your Push Notifications API Sucks
permalink: hey-apple-your-push-notifications-api-sucks
categories:
- Development
- Technology
tags:
- Apple
- push notifications
- APNS
- API
comments: true
---
I've been an Apple fanboy for years. I grew up programming in BASIC on an Apple IIGS. I love my iPhone to death. However, I am not a member of the Church of Jobs that believes Steve can do no wrong. Now I'm a software developer and I appreciate a good, clean, easy to use API, and Apple falls short.

But fear not Apple! You may already have two push notification command formats on the books, but keep reading and I'll suggest a third that won't leave developers frustrated and angry with you.

<!-- more -->

### Basics

The process for sending push notifications is described in Apple's [Local and Push Notification Programming Guide: Provider Communication with Apple Push Notification Service](http://developer.apple.com/library/ios/#documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingWIthAPS/CommunicatingWIthAPS.html).

The service requires you to export a certificate from Apple's Keychain, and use it to authenticate a secure TCP stream. The commands you send to the stream must be encoded down to the binary level, paying attention to endianness, something I haven't even really thought about since school. That's not what annoys me, however. I understand byte encodings and I can slap together byte arrays pretty well. I understand that going down to such a low level with so little overhead probably allows for some pretty incredible speed benefits. Since the iOS platform seems to be doing pretty well, I can't begrudge Apple developers from trying to scale their system as effectively as possible.

The problem is that systems need feedback to correct for errors, and Apple gives little or none.

### Method 1: Simple Notification Format

Once the TCP stream is established, Apple waits (impatiently) for you to send one or more push notification commands, and (wisely) prefers that you send several in the same batch to cut down on the connect/disconnect overhead. A single command using the Simple Notification Format looks like this at the byte level:

![Apple Simple Notification Format](/images/aps_provider_binary.jpg)

The problem, as I mentioned, is feedback. You don't get any. Apple wants you to send as many notifications in one batch as possible. If you do something wrong, Apple will silently drop the connection. The problem is the connection is asynchronous. If in the middle of a batch of 50 notifications, Notification \#23 is invalid, you may send several more notifications before the connection is dropped. Worse, the whole batch isn't atomically accepted or denied. Notifications \#1-22 will be delivered. How do you know which notification was to blame, or how to retry items \#24-50?

The answer is you can't. Do I really have to wait 500ms between each send to make sure the connection doesn't drop in the meantime? If I need to send 1000 notifications, that would take over 8 minutes, and it shouldn't have to.

### Enhanced Notification Format

I'm fairly certain that the Simple Notification Format was Apple's first attempt, and that the Enhanced Notification Format was devised to address some of the shortcomings of the first. I have no proof of this or information on which came when, although it would seem to make sense as I've described it.

In any case, the Enhanced format claims to offer the following advantages:

-   Notification Expiration
-   Error Response ... kind of

The expiration is good; no complaints there. It's the error response that misses the mark.

Here is what the Enhanced Notification Format looks like:

![Apple Enhanced Notification Format](/images/aps_binary_provider_2.jpg)

Like the simple format, if all is well, no response from Apple. If something is awry, however, Apple promises to send you a response in this format before severing the connection:

![Apple Enhanced Format Error Response](/images/aps_binary_error.jpg)

This would appear to solve all the problems, but it turns out to be exceedingly difficult to use.

Like the simple format, the asynchronous nature of the connection means you aren't guaranteed to receive the error response directly after the offending command. This makes the identifier extremely important. In my opinion, it makes most sense to arrange an array of notifications to be sent as a batch, and then assign an identifier to each one equal to the index order in the array. This way, if you get the error response, it makes it easy to find the offender, and start another connection to retry those that come after.

That is, if you can get the error response. In most programming languages, blocking, synchronous reads and writes are the norm. Assuming a successful notification, Apple will not respond, meaning you cannot call Read on the stream, because that would block, and then you can't send the rest of the notifications.

It is possible to do this. After a full day of frustration and hand-wringing, I was able to make it work, but it requires WAY too much work. I hope to blog about this soon, but my solution involved asynchronous reads and a ManualResetEvent in order to keep everything in check. It shouldn't be that hard!

### Proposed Push Notification Format

Let me be clear. **This does not really exist.** This is my suggestion to the engineers at Apple for a third notification format. I don't have the patience to create the nifty byte block diagrams, but hopefully this will get the point across.

-   Command - 1 byte = The value 2 seems to be open.
-   Count - 4 bytes, big endian encoded integer - the number of notifications you intend to send in this batch. Apple would set some sensible limits for this and then clearly document it.
-   The current enhanced notification format, or something very much like it, repeated as many times as you claimed you would previously.

After the last batch command is sent, Apple would always respond! This would allow the sending application to do an easy blocking Read operation in order to retrieve the following:

-   Status - 1 byte - A simple acknowledgment status code. A value of 0 would indicate that everything was successful and all push notifications in the batch were accepted. Other codes would indicate whether some notifications at all were sent, or if the entire conversation was gibberish that Apple will not accept.
-   Number of command error responses - 4 bytes - big-endian encoded integer - If this value was greater than zero, it would indicate that there are status responses for individual commands, i.e. some notifications went through, and Apple is about to give you information about all of the ones that didn't.
-   The current enhanced notification error response, repeated as many times as the error count indicated previously. Because the application already was able to read how many to expect, it can again do blocking reads to receive each one, after which both client and server understand that the conversation for this batch is over. If there were no errors, Apple could leave the connection open, which would enable the application to send another 2 command to initiate another batch.

So that is my suggestion. I think it provides more ease of use to the application developer (regardless of programming language) and would maintain the speed and scalability that I'm sure is a rigid requirement on the Cupertino campus. At least I think so - it's not like they're letting me peek at their source code.

Apple, the ball is in your court. Hopefully someone over there notices and takes it to heart!

Have an idea for how to improve the protocol further? Let me know!
