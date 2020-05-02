---
layout: post
date: 2014-04-01
title: NServiceBus Transport for RFC 1149
permalink: nservicebus-transport-for-rfc-1149
categories:
- Development
tags:
- NServiceBus
- source code
- April Fools
comments: true
---
As readers of this blog already know, [NServiceBus](http://particular.net/NServiceBus) offers a great framework for building distributed systems with publish/subscribe, automatic retries, long-running business processes, high performance, and scalability. It offers a fully pluggable transport mechanism so that it can be run over MSMQ, RabbitMQ, Windows Azure, or even use SQL Server as its queuing infrastructure. No matter which transport you choose, NServiceBus enables you to build a highly reliable system with minimal effort.

**But who wants that?**

Honestly the developers at Particular have gone a little bit overboard with how easy they have made it to build these robust distributed systems. This is why it’s such good news that, thanks to me, there is finally an NServiceBus transport available that supports [RFC 1149: IP Datagrams over Avian Carriers](http://tools.ietf.org/html/rfc1149).

That’s right, MSMQ, RabbitMQ, and all those existing transports? Their major failing is they’re all too reliable. There’s just no challenge in creating a system on such a reliable transport. You do that, and your system may be laden with undesirable side effects like running smoothly, and never losing data. As a result, you might get to head home from work on time and be forced to spend time with your family who loves you. You might never get phone calls waking you up in the middle of the night to deal with some sort of crisis. Can you imagine?

And worst of all, without the system crashing down every Monday, Tuesday, and every other Thursday, your boss may start to realize he doesn’t need someone as skilled as you to run it anymore, and may replace you with a couple college interns.

So what you need is a much less reliable transport, and that transport is [NServiceBus.Rfc1149](https://github.com/DavidBoike/NServiceBus.Rfc1149). You’re welcome.

<!-- more -->

So here’s how it works:

-   Messages are stored as text files on a flash drive.
-   The transport uses the first removable drive it can find with a “NServiceBus.Rfc1149” directory at the root level. It doesn’t create this for you. That would be too easy, and you’re not in this for easy.
-   A directory is created for each machine name.
-   Within the machine name directory, a directory is created for each queue.
-   Sent messages are placed in the appropriate directory for the destination machine and queue.
-   Each endpoint reads files from the appropriate queue directory.
-   In order for the messages to be received by the other machines, you must remove the flash drive from the current machine, attach it to the leg of your avian carrier (a [domesticated rock pigeon, *Columba livia*](http://en.wikipedia.org/wiki/Rock_pigeon), is recommended) and send the carrier to the physical location of the destination server. Every minute, the transport counts the messages bound for other machines and makes a recommendation for a destination server based on highest pending message count.
-   If no suitable flash drive can be found, it is impossible to send outgoing messages, so sending messages will fail silently. It’s more fun that way.
-   Because no messages can be sent if no flash drive is present, it's advisable to use multiple flash drives with multiple avian carriers. We call this *scaling out*.

 Sound good? Here’s how to use it:

-   Clone the [NServiceBus.Rfc1149](https://github.com/DavidBoike/NServiceBus.Rfc1149) source from GitHub and build it yourself. Seriously, when it comes to development getting too easy, NuGet packages are half of the problem.
-   Reference the NServiceBus.Rfc1149 assembly in your endpoints.
-   Stock up on birdseed and newspaper for your avian carriers.
-   Configure the RFC 1149 transport with the following:

 <script src="https://gist.github.com/9879119.js"></script>

Then fire up your solution and enjoy the low latency and unreliability! Your job security should be ensured for years.

* * * * *

*Yes, this is an April Fools post, but the transport really does work, after a fashion, and can be a useful exercise for understanding a little more about how NServiceBus works at its lower levels. [Check out the source code on GitHub](https://github.com/DavidBoike/NServiceBus.Rfc1149); it’s well-documented and should be instructive.*
