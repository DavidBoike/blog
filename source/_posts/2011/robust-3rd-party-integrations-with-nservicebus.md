---
layout: post
date: 2011-11-03
title: Robust 3rd Party Integrations with NServiceBus
permalink: robust-3rd-party-integrations-with-nservicebus
categories:
- Development
tags:
- web service
- NServiceBus
- source code
- integration
comments: true
---
A common question about NServiceBus is how to use it to integrate with an external partner. The requirements usually go something like this:

-   The third party will contact us via a web service, passing us a transaction identifier and a collection of fields.
-   If we successfully receive the message in the web service, we respond with a HTTP 200 OK status code.  If they do not receive the acknowledgement, they will assume a failure and attempt to retry the web service later.
-   Once we receive the message from the third party, we need to distribute (think publish) the contents of the message to more than one internal process, each of which are completely independent of each other.
-   We need to logically receive each message once and only once. In other words, it would be a “Very Bad Thing” for one of the internal subscribing processes to receive the same notification more than once.

This was most recently asked in [this StackOverflow question](http://stackoverflow.com/questions/7768464/nservicebus-design-ideas/), where it became difficult to explain more within the 600 character comment limit. The best explanation is example code, so here it is.

<!-- more -->

Check out [NServiceBus External WebService Example on GitHub](https://github.com/DavidBoike/NServiceBus-External-WebService-Example). Here is a high-level overview of the project:

-   **WebServiceHost**
    -   This project implements a simple ASMX web service.
    -   The web request information is translated into an NServiceBus command message, and then Sent on the Bus.

-   **TestClient**
    -   This console app project tests invoking the web service using a standard .NET web service proxy. No NServiceBus to be found here.

-   **InternalService**
    -   An NServiceBus endpoint containing a Saga that receives the NServiceBus message from the web service.
    -   Even if the web service received the message successfully, we can’t know that our partner’s server didn’t fail before they received, or were able to record the acknowledgement, or that a network failure didn’t prevent our reply from arriving at all.
    -   Because of this, it’s possible that our partner may retry sending the message even though we’ve already received it once.  This means we may receive duplicate messages, and we need to insulate our internal processes from that.
        -   To do that, we accept and publish an event corresponding to the first message received.  We also store the fact that we received that message in saga data so that we will know to ignore any duplicate messages.
        -   We also request a timeout notification from the Timeout Manager so that after some reasonable period (after we know the partner could no longer possibly be retrying) we can clean up the saga data.

-   **InternalService.Messages**
    -   This assembly contains all the message schema for the project, including:
        -   ExternalServiceMsg – the web service sends this to InternalService.
        -   IExternalMessageReceivedEvent – the event that is published upon receipt of a non-duplicated ExternalServiceMsg. We are using an interface to define the event, which is recommended as it [enables easier versioning later on thanks to an interface’s multiple inheritance abilities](http://www.nservicebus.com/MessagesAsInterfaces.aspx).
        -   ExternalServiceSagaData – this defines the state data our saga will use to keep track of which messages it has received.

    -   Note that it is probably *NOT* best practice to keep all these things in the same assembly.  Udi would probably recommend that the command and saga data (which are internal to the logical service) be segregated from the event (which forms the external contract for the service).

-   **Subscriber1** and **Subscriber2**
    -   These endpoints subscribe to the IExternalMessageReceivedEvent and pump some info to the Console so that we can watch it happen.

-   **ExampleTimeoutManager**
    -   For active development, you should probably just keep a Timeout Manager running as a service on your development machine, but this is provided to keep the example self-contained and as an example of how to configure the [Timeout Manager package available from NuGet](http://www.nuget.org/List/Packages/NServiceBus.TimeoutManager).  I used a fairly nonstandard queue name so that it won’t conflict if you do already have a running timeout manager on your system.

The project uses the following NuGet packages to make it as easy as possible to get started:

-   [Log4Net](http://nuget.org/List/Packages/Log4Net), as a dependency of NServiceBus.
-   [NServiceBus](http://nuget.org/List/Packages/NServiceBus) – for the core NServiceBus DLLs.
    -   A messages assembly, however, doesn’t need NServiceBus.Core.dll or Log4Net.dll, so you can just “Install-Package NServiceBus” on this assembly and then manually remove those two references.

-   NServiceBus.Host – for the InternalService endpoint.
-   [NServiceBus.TimeoutManager](http://nuget.org/List/Packages/NServiceBus.TimeoutManager)

The project also uses the [NuGetPowerTools](http://www.nuget.org/List/Packages/NuGetPowerTools) package to automatically download all the required packages when you build the solution [as described in this article from David Ebbo](http://blog.davidebbo.com/2011/08/easy-way-to-set-up-nuget-to-restore.html).  I highly recommend it.

### Updates November 11, 2013 – NServiceBus 4.2

It has been almost 2 years since I originally wrote this blog post, and Mark Holdt asked in the comments if there was anything I would do different now? Based on the passage of time and the changes from NServiceBus 2.6 (in which the code was originally written) to today’s current version of 4.2, yes there are quite a few things that would be different.

Hopefully I’ll get a chance soon to update this code, but until then, here are some things that would be different today:

As of V4, NServiceBus no longer has a dependency on log4net, so I would probably remove that dependency and use the built-in NServiceBus.Logging namespace (which is an API copy of log4net) instead. If I wanted to use log4net or NLog I could drop that in, but it’s much easier to just keep the example simple.

There would be no external timeout manager. As of V3, the timeout manager is integrated with the NServiceBus Host.

Obviously some API changed from NServiceBus 2.6 to 4.2. Off the top of my head:

-   MsmqTransportConfig to set the input/error queues, number of worker threads, and max retries is now deprecated and replaced by some different sections that are more accurate based on MSMQ not being the only transport available anymore. I’m pretty sure the runtime warnings would provide pretty good pointers on what to update.
-   The Timeout API has changed to reflect that you don’t have to send timeout messages anywhere – it’s handled by the internal timeout manager much more cleanly.

In the original the saga data is in the InternalService.Messages assembly. My thinking on this has changed quite a bit in the past 2 years. Saga data is the storage for the saga and completely internal to its implementation. Nobody else has any business knowing anything about it! Therefore I would put it in the same assembly as the saga itself (InternalService) potentially even as a nested class inside the Saga.

The web service: Now that Microsoft has [officially declared ASMX web services to be a “legacy technology”](http://johnwsaunders3.wordpress.com/2009/07/03/microsoft-says-asmx-web-services-are-a-%E2%80%9Clegacy-technology%E2%80%9D/) it is hard to recommend their use anywhere. I really didn’t mind ASMX services at all and I *really* despise WCF. Therefore I would try to implement the web service with WebAPI if possible, or even as a vanilla ASP.NET MVC action method. It would really depend upon the external partner’s abilities.

Other than these things, everything remains pretty much the same. The overall concept of how to handle this situation with messaging, after all, is still sound.
