---
layout: post
date: 2010-04-30
title: NServiceBus TimeoutManager Revisited
permalink: nservicebus-timeoutmanager-revisited
categories:
- Development
tags:
- NServiceBus
- TimeoutManager
- source code
comments: true
---
In my [previous post](http://www.make-awesome.com/2010/04/building-a-better-nservicebus-timeoutmanager/) I attempted to build an NServiceBus Timeout Manager that used timers and events to send back timeout messages when they came due instead of looping through the message queue with thread sleeps until each message was ready to send back that occurs in the timeout manager included with the NServiceBus 2.0 RTM.

That implementation stored timeouts that were set to expire "soon" in memory, and stored everything in a secondary MSMQ queue so that if the application failed, it could recover when it started back up.

I realized that a better implementation would be to separate out the storage using a provider implementation.  This way, the entire implementation could be switched out completely by providing a second class that implements ITimeoutStorageProvider.

Also, I refactored the MsmqTimeoutStorage class into a base class that's concerned with the in-memory timeout handling, and the superclass that adds in the actual storage implementation with MSMQ.

<!-- more -->

This way, switching to database storage would be as easy as creating a class that inherits TimeoutStorageProvider (more on the generic parameter in a bit) and implements the following methods:

    public abstract void Init();
    protected abstract T StoreTimeout(IMessageContext context, TimeoutMessage msg);
    protected abstract void RemoveBySagaId(Guid sagaId);
    protected abstract void RemoveTimeout(T id);
    protected abstract List&lt;TimeoutEntry&lt;T&gt;&gt; GetTimeouts(DateTime cutoff);

The generic parameter T is the ID unique to the storage provider, used later to remove it from storage after the timeout is complete. For the MSMQ implementation, this is a string because a MSMQ message's Id parameter is a string. For a database implementation with Microsoft SQL it would probably be advisable to use a Guid.

Here is the source:

-   [Timeout Manager Source (Version 1.1)](/downloads/TimeoutManager-1.1.zip) - Visual Studio 2008 project - 4/30/2010

 To build, simply unzip the project, include it in a solution, fix the references to the NServiceBus components and Log4Net, build, and go.

Feel free to take the code and use it however you like under the terms of the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).  I offer it without warranty, express or implied, and as always your mileage may vary.  I only ask that you share any improvements you make to it so that everyone can benefit.
