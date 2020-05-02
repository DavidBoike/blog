---
layout: post
date: 2010-10-27
title: Why not publish NServiceBus messages from a web application?
permalink: why-not-publish-nservicebus-messages-from-a-web-application
categories:
- Development
tags:
- NServiceBus
comments: true
---

> Things change, and this guidance is now a bit outdated. Improvements Microsoft has made to IIS, more varied methods of hosting .NET web applications, and the addition of additional NServiceBus transports have made things much more nuanced. It is possible, and in some circumstances, even advisable to publish events from within a web application, but it should still be considered very carefully before being implemented.
>
> Read the updated [NServiceBus guidance for publishing events from web applications](http://docs.particular.net/nservicebus/hosting/publishing-from-web-applications) now.
>
> *The rest of this article should be considered deprecated and is here for historical purposes only.*

It may be the single most asked question on the [NServiceBus Yahoo Group](http://tech.groups.yahoo.com/group/nservicebus/), and it usually goes something like this:

> The [NServiceBus Documentation/FAQ](http://www.nservicebus.com/Documentation.aspx) says not to publish messages from a web application. But...why?

All the documentation says on the topic amounts to "Don't. Bus.Send() a message instead." This is true and good practice, but developers are smart people that aren't commonly happy with an answer that doesn't include a why.

In this article I'll go into some depth on the three main reasons why you're better off using Bus.Send() when in the web world than Bus.Publish().

<!-- more -->

### Transactions and Consistency

Messages that are published on the bus are like events - they should announce something that has already happened. If the thing didn't happen, no event should be published, and if for some reason the event cannot be published, the work that is being announced should be rolled back as well.

With an NServiceBus transactional endpoint, we get this for free - each message is handled within a TransactionScope and succeeds or fails as an atomic unit.

In a website, we aren't so protected by default. In a web environment, we respond to an HTTP request, not a queued, replayable message. If we alter state in some way, and then the web service fails, we will never get the opportunity to announce that work to the world, and our application may be left in an inconsistent state.

But, you say, I'll wrap the work and the Bus.Publish() in a TransactionScope and then everything will be atomic. This is better - you can no longer leave the application as a whole in an inconsistent state. However, the original HTTP request is lost. The user gets an error message and will have to repeat their request. However it negates some of the benefits inherent in NServiceBus.

Some people may think that the NServiceBus documentation, by saying to Send() and not Publish(), is telling them to send a message an application layer to essentially publish the same information without doing any work, but this is incorrect. What the documentation really means is that when the web request is received that requires a change of application state, you should **immediately** send a command to the application layer, and then have the application layer do all the work and publish the result message. This method turns the loss-prone HTTP request into a durable message that can be queued and retried.

The added benefit of this methodology is that it turns your web application into a semi-dumb face that displays cacheable data and accepts user inputs, which means your website scalability can go through the roof, being liberated of all the heavy lifting that was previously weighing down the web application's thread pool.

This development pattern is difficult for some development teams to grasp. Let's face it, when many of us start with NServiceBus, we are one developer on a team who thinks this messaging stuff is pretty cool. The rest of the developers on the team may not be totally on board yet. They may balk at having to simultaneously run a bunch of console windows in order to have the website do anything. Maybe there's the cranky old-timer on the team who got burned by MSMQ one time years ago and now swears that anything that uses it is garbage.

In any case, NServiceBus can have a bit of a learning curve and instead of immediate immersion, it can be easier to wade in as you begin to feel comfortable. In these situations a developer may only want to use NServiceBus for certain long-running processes that can't complete within a normal web request time window. In my opinion, this is totally fine. In these situations you could conceivably publish events from within a web application as long as a TransactionScope ensure atomicity. NServiceBus will not stop you from doing so, however I still recommend against it. If you constrain your event publishing to a back-end application service, it will help in the future when you want to more fully embrace using NServiceBus to its full potential, as you won't have to change subscription configurations when you move functionality into the application layer.

### Web Application Scale-Out

So you've decided you can live with all that, and you still want to publish events from your web application. You code up a couple services that subscribe to MyNeatEvent messages coming from MyWebsite@MyWebserver. Awesome. You get your code in production, and you become a victim of your own success - the web server is having trouble handling the load and you need to load balance just to keep up with the traffic, much less deal with maintenance and updates.

Uh-oh.

The new load-balanced web server will have its own local input queue, MyWebsite@MySecondWebserver. You're now publishing messages from two locations, which would mean subscribers would need to subscribe to the message from two locations. I'm not even sure NServiceBus will allow this; I haven't tried it and don't want to, because even if it worked, it would be a mess.

If you had published that event from an application service, you could easily scale out your website. The new website node would just be another location sending commands to the application layer.

If the application service needs to be scaled out, you can put a Distributor in front of the service's input queue and then have worker nodes on as many servers as necessary request work from the distributor. Both layers can be scaled out simply painlessly.

### Web App Recycling

I consider this the lesser of the three reasons, but it still bears mention. IIS automatically recycles worker processes. This means that at any moment, your NServiceBus-endpoint-in-a-webapp could cease to be, replaced by a new one, or in the case of a low-traffic website, it might not be respawned at all. An incoming MSMQ message will not wake up the website; it will fall on deaf ears. (Of course, it's probably possible to do an end run around this limitation with Windows Activation Services but that would probably be more trouble than it's worth.)

This is why the MsmqTransport in a web application is usually configured to be non-transactional and to purge its input queue on startup, because normally, messages handled by a web application amount to "what you have in your cache is now wrong" which don't apply to a web application just starting up that has nothing in cache.

The reason I consider this to be the lesser of the three reasons is because if you're interested in creating enterprise systems with NServiceBus, you are probably operating a website that is fairly busy that won't go idle and silent, however, it seems obvious that a Windows Service makes a much more appropriate host for a message publishing endpoint than a web application that may be spun down at any time.

### Conclusion

Hopefully this clears up the confusion surrounding why it's best not to publish NServiceBus events from a web application. Sure, the framework will technically let you do it, but it is to do as the FAQ says: don't. Your reward: better, more fault-tolerant, more performant web applications that are easier to scale up and out.
