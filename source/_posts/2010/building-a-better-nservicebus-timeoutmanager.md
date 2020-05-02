---
layout: post
date: 2010-04-26
title: Building a better NServiceBus TimeoutManager
permalink: building-a-better-nservicebus-timeoutmanager
categories:
- Development
tags:
- NServiceBus
- TimeoutManager
- source code
comments: true
---
***Update 4/30/2010:** I [updated this code](http://www.make-awesome.com/2010/04/nservicebus-timeoutmanager-revisited/) to use a provider implementation so that it is easy to switch out the MSMQ storage for database storage or any other storage medium.  [Check it out!](http://www.make-awesome.com/2010/04/nservicebus-timeoutmanager-revisited/)*

[Udi Dahan](http://www.udidahan.com/) himself has stated that the TimeoutManager included with [NServiceBus 2.0](http://www.nservicebus.com) is "not generically suitable for production" purposes, and since I needed to create a system that used a TimeoutManager for multiple sagas in production, I set about the task to create a better one.

For a complete discussion, check out the message thread [Timeout Manager process causes heavy disk IO](http://tech.groups.yahoo.com/group/nservicebus/message/5117), or for a quicker read, here are some of the limitations of the TimeoutManager included with NServiceBus 2.0:

<!-- more -->

-   Operates by doing a short thread sleep, and then resending the message back to the same queue until it expires and can be sent back.  This creates a lot of disk I/O in the Microsoft Message Queue system from the message being written back to persistent storage many times per second.
-   In order to achieve better performance, you must increase the number of milliseconds sleep, but this has the side effect of decreasing time resolution.  It might be OK to sleep for 10 seconds if you're dealing with a timeout of 20 minutes, but it's unacceptable for a timeout of less than a minute.  What if the Timeout Manager needs to handle both?

 Here are some of the considerations I made for a new design:

-   Obviously a timer is needed to raise an event when a timeout is expired instead of looping and sleeping.
-   The messages must still be stored in persistent storage.  Removing the dependency on Message Queue and storing the timeout messages in memory would not be acceptable because a failure in the Timeout Manager would result in the loss of timeout messages.
-   Replacing the MSMQ dependency with a database is not an acceptable solution because it would require excessive pinging of the database.  This would also inject a lot of necessary configuration.
-   While use of a distributed cache would probably solve some issues, I'm unwilling to use one just for this.  I want to get as much bang for my buck as possible using just the requirements that NServiceBus already has (MSMQ, DTC, etc.) without introducing new dependencies.

 What I designed is a system that receives TimeoutMessage through a handler on a queue similar to the bundled timeout manager, and then stores that message on a second MSMQ queue.  At the same time, timeouts that are due "soon" (perhaps within 30 minutes) are also kept in memory.

An instance timer is set to go off when the first timeout in memory is due, at which point the corresponding message is removed from the queue and the timeout is sent back to the saga, and the instance timer is reset.

At startup, after a failure, or periodically via another timer, all the messages in the storage queue are rescanned and the in-memory queue is rebuilt.

I don't believe that this is by any means a perfect system, in fact I believe it has the following weaknesses:

-   There is quite a bit of thread locking any time the in-memory queue is changed.  For a high-traffic system this could be problematic.
-   I have no idea how well this could be utilized in a failover environment.
-   I'm sure the code probably has several weaknesses I haven't thought of.  I'm far from a messaging expert.

 The last point is why I invite you to download the code and bang on it yourself.

-   [Timeout Manager Source (Version 1.0)](/downloads/TimeoutManager-1.0.zip) - Visual Studio 2008 project - 4/26/2010
-   TimeoutManager 1.1 Source - See [NServiceBus TimeoutManager Revisited](http://www.make-awesome.com/2010/04/nservicebus-timeoutmanager-revisited/)

 To build, simply unzip the project, include it in a solution, fix the references to the NServiceBus components and Log4Net, build, and go.

Feel free to take the code and use it however you like under the terms of the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).  I offer it without warranty, express or implied, and as always your mileage may vary.  I only ask that you share any improvements you make to it so that everyone can benefit.
