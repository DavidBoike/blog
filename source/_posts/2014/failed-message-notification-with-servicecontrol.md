---
layout: post
date: 2014-05-07
title: Failed Message Notification with ServiceControl
permalink: failed-message-notification-with-servicecontrol
categories:
- Development
tags:
- NServiceBus
- ServiceInsight
- ServiceControl
comments: true
---
In my post [Distributed System Monitoring Done Right](/2014/04/distributed-system-monitoring-done-right/), I mentioned in passing how [ServicePulse](http://particular.net/servicepulse) doesn't ship with any built-in notification system for failed messages, but that you could easily build a system to send an email (or SMS, or carrier pigeon) to do so.

In this post I'll show you how.

<!-- more -->

First, create a new Class Project called ErrorNotify, and turn it into an endpoint by including the [NServiceBus.Host NuGet package](http://www.nuget.org/packages/NServiceBus.Host).

Next, you need to reference the messages assembly that ServiceControl uses for its externally published events. It's called ServiceControl.Contracts and you can find it in your ServiceControl installation directory. For me that's located at:

C:\\Program Files (x86)\\Particular Software\\ServiceControl\\ServiceControl.Contracts.dll

Note that ServiceControl uses the JSON serializer internally, so if you subscribe to the failed message notifications, your endpoint will need to use the JSON serializer too. Even if you use a different serializer (like the default XML one) in the rest of your system, it doesn't matter because this error notifier endpoint is completely separate and decoupled from the rest of your system.

To set the serializer to JSON, modify your EndpointConfig.cs given to you by NuGet so that it implements IWantCustomInitialization:

<script src="https://gist.github.com/ff420add0138b6b6c9d9.js?file=EndpointConfig.cs"></script>

Next we need to write the actual code to subscribe to the MessageFailed event published by ServiceControl. I'm not going to show you how to build and send an email. That would be boring and silly and I'm sure you can do it yourself. But it is important to point out that you can extract the FailedMessageId from the failed message details and craft a URL using ServiceInsight's URL scheme that will launch [ServiceInsight](http://particular.net/serviceinsight)and show you the offending message directly!

<script src="https://gist.github.com/ff420add0138b6b6c9d9.js?file=ErrorNotify.cs"></script>

Lastly, we need to modify the App.config file to subscribe to messages from the Particular.ServiceControl service.

<script src="https://gist.github.com/ff420add0138b6b6c9d9.js?file=App.config"></script>

That's it! Once we deploy this code, we will get email notifications of failures complete with links to ServiceInsight so we can go figure out exactly what went wrong.
