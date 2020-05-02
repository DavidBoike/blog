---
layout: post
date: 2013-10-21
title: Developing with NServiceBus and RavenDB simultaneously
permalink: developing-with-nservicebus-and-ravendb-simultaneously
categories:
- Development
tags:
- NServiceBus
- Twin Cities Code Camp
- RavenDB
- presentations
comments: true
---
I presented an introduction to Service Oriented Architecture at [Twin Cities Code Camp](http://www.twincitiescodecamp.com/TCCC/Default.aspx) over the weekend, and unfortunately hit a little bit of a snag during one one of the demos, so unfortunately while the audience got to see all the code that makes Publish/Subscribe work in NServiceBus, they didn't get to see it actually, you know, *work*. Such is the risk of a live demo. (Even if you test it the day before, which I did!)

This morning I was able to take a closer look at the error message and figure out what is going on. I'm currently starting a project using RavenDB so the first thing I did was to upgrade RavenDB to the latest stable version, 2.5 Build 2700.

Ummmmm....shouldn't have done that.

A license for NServiceBus (including the developer license you get for free from the NServiceBus website) covers your use of RavenDB to handle NServiceBus related storage, for subscriptions, sagas, timeouts, and a few other things that are handled by the NServiceBus framework. If you want to use Raven for your own application (which I would highly recommend) you need a separate license for that in production.

For development where Raven isn't really licensed anyway, I didn't think it would matter that much, but I was wrong.

> Raven.Abstractions.Exceptions.OperationVetoedException: PUT vetoed by Raven.Database.Server.Security.Triggers.WindowsAuthPutTrigger because: Cannot setup Windows Authentication without a valid commercial license.

 Oops! NServiceBus V4 uses Raven 2.0 and hasn't been tested with 2.5 yet. So what to do if you want to develop solutions with both simultaneously? First, allow NServiceBus to install RavenDB 2.0 on port 8080 as is the default. Then, if you want to develop with RavenDB 2.5 as well, install that to port 8081. In my opinion it's easier to set the nonstandard port on your DocumentStore's URL (which you have to set anyway) than to modify the NServiceBus conventions that (while they are overridable) expect to see RavenDB 2.0 living on port 8080.
