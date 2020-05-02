---
layout: post
date: 2014-05-27
title: NServiceBus and the Mystery of IWantCustomInitialization
permalink: nservicebus-and-the-mystery-of-iwantcustominitialization
categories:
- Development
tags:
- NServiceBus
- dependency injection
- book
comments: true
---
Recently [Romiko Derbynew](http://romikoderbynew.com/) was reading my book, [Learning NServiceBus](http://www.packtpub.com/build-distributed-software-systems-using-dot-net-enterprise-service-bus/book), and noticed a contradiction between the manuscript and the included source code:

> In the Sample for DependecyInjection in the book, the code is:
>
> public class ConfigureDependencyInjection : NServiceBus.**IWantCustomInitialization**
>
> However in the book, is says
>
> IWantCustomInitialization should be implemented **only on the class** that implements **IConfigureThisEndpoint** and allows you to perform customizations that are unique to that endpoint.

 Of course I could wax philosophic about the tight deadline of book publishing, or how difficult it is to keep the sample code in sync with the manuscript, or how I probably wrote that part of the code and that part of the manuscript on different days on different pre-betas of NServiceBus 4.0, but what it comes down to at the end of the day is [\#FAIL](http://failblog.cheezburger.com/)!

So here’s the real scoop, or at least, updated information as I see it and would recommend now, circa NServiceBus 4.6.1.

<!-- more -->

The part of the book referenced comes from Chapter 5: Advanced Messaging, where I am discussing the various general extension points in the NServiceBus framework that you can hook into by implementing certain marker interfaces, and then at startup, NServiceBus finds all these classes via assembly scanning and executes them at the proper time.

The interfaces are nominally described in the order that they are executed, and so I described IWantCustomInitialization third, after IWantCustomLogging and IWantToRunBeforeConfiguration, and described it as shown above. (The quoted passage is the entire bullet point.)

Unfortunately, it isn’t that easy.

(The following bit of explanation references history that exists mainly in my mind and, therefore, may not be entirely accurate as I’m not willing to dig through years of Git history to prove it. I might get a detail or two wrong, but stay with me.)

IWantCustomInitialization and IWantCustomLogging are somewhat unique in the list because they have been around forever (I gauge “forever” as since I started with NServiceBus at Version 2.0) and in the meantime, all of the other interfaces were added on (at least as far as my memory serves) through the development of V3 and V4.

So in this before-time of long-long-ago, these two interfaces only worked when applied to the EndpointConfig (the class that implements IConfigureThisEndpoint) but the new ones can be on any class, and there can be multiple ones.

Except as it turns out, IWantCustomInitialization pulls double-duty. It will execute either on the EndpointConfig OR as a standalone class, but with one critical difference: **Whether or not it exists on the EndpointConfig changes the order of execution with respect to the other extension point interfaces!**

When implemented on a random class, an IWantCustomInitialization will run third, where I described in the book (after IWantToRunBeforeConfiguration, but before INeedInitialization) but if implemented on EndpointConfig, it will run second only to IWantCustomLogging, which always runs first because otherwise, you don’t have logging.

Confused yet? Here’s the definitive updated order:

1.  IWantCustomLogging (only executes on EndpointConfig)
2.  IWantCustomInitialization, implemented on EndpointConfig
3.  IWantToRunBeforeConfiguration
4.  IWantCustomInitialization, implemented on its own class
5.  INeedInitialization
6.  IWantToRunBeforeConfigurationIsFinalized
7.  IWantToRunWhenConfigurationIsComplete \*
8.  IWantToRunWhenBusStartsAndStops

 *\* One could argue that IWantToRunWhenConfigurationIsComplete should not be listed as a “general extension point” because it alone is located in the NServiceBus.Config namespace, not in the root NServiceBus namespace with all the others. This may have been an oversight that the NServiceBus developers weren’t willing to break SemVer for (which would require bumping to 5.0) or may be intentional, but I personally see the value in having a near-the-end extension point with full access to the DI container.*

So what would I recommend about IWantCustomInitialization now?

I view the duality of “runs at different times depending upon which class it’s implemented on” to be dangerous and I would rather avoid that, especially since INeedInitialization provides basically the exact same behavior at the exact same time. So I would respect history (and the text in the book) and say that IWantCustomInitialization should only be used on the EndpointConfig for endpoint-specific behaviors, or in a BaseEndpointConfig class you inherit real EndpointConfigs from.

So that would make the code sample from the book *wrong*, even though it technically works. I would use INeedInitialization for that class instead.

By the way, this is a great time to mention a previously reported issue with the same section of the book. Even though the text says that “INeedInitialization is the best place to perform common customizations
 such as setting a custom dependency injection container…” but as it turns out, the [only place you can set up a custom DI container is from IWantCustomInitialization on the EndpointConfig](https://groups.google.com/forum/#!msg/particularsoftware/yDWc7LUMH1M/pv_gEQIBuksJ).

And on a closing note, I would suggest that if you don’t get enough evidence that you are human and make mistakes by being a software developer, you should perhaps consider writing a book. ;-)
